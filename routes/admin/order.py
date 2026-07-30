from flask import jsonify, request
from sqlalchemy import text
from app import app, db
from routes.admin.middleware import admin_required


@app.get('/api/admin/orders/dashboard')
@admin_required
def admin_dashboard():
    sql = text("""
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(total_amount), 0) AS total_revenue,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_orders,
            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_orders
        FROM "order"
    """)
    result = db.session.execute(sql).fetchone()

    # Map row result and ensure numeric types are JSON serializable
    data = dict(result._mapping)
    data['total_revenue'] = float(data['total_revenue'])

    return jsonify(data), 200


@app.get('/api/admin/orders')
@admin_required
def admin_get_all_orders():
    sql = text("""
        SELECT 
            o.id,
            o.total_amount,
            o.status,
            o.payment_method,
            o.shipping_address,
            o.create_at,
            u.name  AS customer_name,
            u.email AS customer_email
        FROM "order" o
        LEFT JOIN "user" u ON o.user_id = u.id
        ORDER BY o.id DESC
    """)
    result = db.session.execute(sql).fetchall()

    rows = []
    for row in result:
        item = dict(row._mapping)
        item['total_amount'] = float(item['total_amount']) if item['total_amount'] is not None else 0.0
        # Convert datetime object to ISO string for clean JS handling
        if item.get('create_at'):
            item['create_at'] = str(item['create_at'])
        rows.append(item)

    return jsonify({
        "total": len(rows),
        "orders": rows
    }), 200


@app.put('/api/admin/orders/<int:order_id>/status')
@admin_required
def admin_update_order_status(order_id):
    data = request.get_json(silent=True) or {}
    status = data.get('status')

    if not status:
        return jsonify({'error': 'Status is required'}), 400

    check_sql = text('SELECT id FROM "order" WHERE id = :id')
    order = db.session.execute(check_sql, {'id': order_id}).fetchone()

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    update_sql = text("""
        UPDATE "order"
        SET status = :status
        WHERE id = :id
    """)
    db.session.execute(update_sql, {
        'status': status,
        'id': order_id
    })
    db.session.commit()

    return jsonify({
        'message': 'Order status updated successfully',
        'order_id': order_id,
        'status': status
    }), 200


@app.delete('/api/admin/orders/<int:order_id>')
@admin_required
def admin_delete_order(order_id):
    check_sql = text('SELECT id FROM "order" WHERE id = :id')
    order = db.session.execute(check_sql, {'id': order_id}).fetchone()

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    try:
        # Delete dependent order items first if ON DELETE CASCADE is not set in DB schema
        delete_items_sql = text('DELETE FROM order_item WHERE order_id = :id')
        db.session.execute(delete_items_sql, {'id': order_id})

        delete_sql = text('DELETE FROM "order" WHERE id = :id')
        db.session.execute(delete_sql, {'id': order_id})
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete order due to database constraint', 'details': str(e)}), 500

    return jsonify({
        'message': 'Order deleted successfully',
        'order_id': order_id
    }), 200