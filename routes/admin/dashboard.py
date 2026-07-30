from datetime import datetime, timedelta
from flask import jsonify
from sqlalchemy import text

from app import app, db
from routes.admin.middleware import admin_required


# ==========================================
# 1. DASHBOARD ANALYTICS METRICS
# ==========================================
@app.get('/api/dashboard/stats')
@admin_required
def get_dashboard_stats():
    try:
        today_str = datetime.now().strftime('%Y-%m-%d')
        yesterday_str = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')

        # Query ទាញទិន្នន័យ Revenue, Orders, New Customers និងទាញ Products Live ចេញពី Table `product`
        sql_stats = text("""
            SELECT 
                -- Revenue & Orders (ពី Table order)
                COALESCE(SUM(CASE WHEN DATE(create_at) = :today AND LOWER(status) IN ('paid', 'completed') THEN total_amount ELSE 0 END), 0) AS revenue_today,
                COALESCE(SUM(CASE WHEN DATE(create_at) = :yesterday AND LOWER(status) IN ('paid', 'completed') THEN total_amount ELSE 0 END), 0) AS revenue_yesterday,
                COUNT(CASE WHEN DATE(create_at) = :today THEN 1 END) AS orders_today,
                COUNT(CASE WHEN DATE(create_at) = :yesterday THEN 1 END) AS orders_yesterday,

                -- Products Live & Low Stock (ទាញចេញពី Table product ដោយផ្ទាល់)
                (SELECT COUNT(*) FROM product) AS products_live,
                (SELECT COUNT(*) FROM product WHERE stock <= 5) AS low_stock_count,

                -- New Customers (ពី Table user)
                (SELECT COUNT(*) FROM "user" WHERE DATE(create_at) = :today) AS new_customers_today,
                (SELECT COUNT(*) FROM "user" WHERE DATE(create_at) = :yesterday) AS new_customers_yesterday
            FROM "order"
        """)

        res = db.session.execute(sql_stats, {'today': today_str, 'yesterday': yesterday_str}).fetchone()
        row = dict(res._mapping) if res else {}

        # គណនា Revenue Delta %
        rev_today = float(row.get('revenue_today', 0))
        rev_yesterday = float(row.get('revenue_yesterday', 0))
        if rev_yesterday > 0:
            rev_pct = ((rev_today - rev_yesterday) / rev_yesterday) * 100
            rev_arrow = "&#9650;" if rev_pct >= 0 else "&#9660;"
            revenue_delta = f"{rev_arrow} {abs(rev_pct):.1f}% vs yesterday"
        else:
            revenue_delta = "&#9650; 0% vs yesterday"

        # គណនា Orders Delta
        orders_today = row.get('orders_today', 0)
        orders_yesterday = row.get('orders_yesterday', 0)
        ord_diff = orders_today - orders_yesterday
        orders_arrow = "&#9650;" if ord_diff >= 0 else "&#9660;"
        orders_delta = f"{orders_arrow} {abs(ord_diff)} new"

        # គណនា Customers Delta
        cust_today = row.get('new_customers_today', 0)
        cust_yesterday = row.get('new_customers_yesterday', 0)
        cust_diff = cust_today - cust_yesterday
        cust_arrow = "&#9650;" if cust_diff >= 0 else "&#9660;"
        customers_delta = f"{cust_arrow} {abs(cust_diff)} vs yesterday"

        return jsonify({
            "revenue_today": rev_today,
            "revenue_delta": revenue_delta,
            "orders_today": orders_today,
            "orders_delta": orders_delta,
            "products_live": row.get('products_live', 0),  # បញ្ជូន products_live ទៅ Front-end
            "low_stock_count": row.get('low_stock_count', 0),
            "new_customers": cust_today,
            "customers_delta": customers_delta
        }), 200

    except Exception as e:
        app.logger.error(f"Dashboard Stats Error: {e}")
        return jsonify({"error": "Internal server error"}), 500