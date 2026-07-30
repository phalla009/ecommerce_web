from datetime import datetime
from flask import jsonify, request
from sqlalchemy import text
from app import app, db
from model import Category
from routes.admin.middleware import admin_required


# 1. READ ALL CATEGORIES
@app.get('/api/category')
@app.get('/api/category/list')
def get_all_category():
    try:
        sql = text(
            "SELECT id, UPPER(SUBSTR(name, 1, 1)) || LOWER(SUBSTR(name, 2)) AS name, "
            "description, 'true' as active, create_at FROM category ORDER BY id DESC"
        )
        result = db.session.execute(sql).fetchall()

        rows = []
        for row in result:
            item = dict(row._mapping)
            if item.get('create_at') and isinstance(item['create_at'], datetime):
                item['create_at'] = item['create_at'].strftime("%Y-%m-%d %H:%M:%S")
            rows.append(item)

        return jsonify(rows), 200
    except Exception as e:
        print("Database Error:", e)
        return jsonify({'error': str(e)}), 500


# 2. READ SINGLE CATEGORY
@app.get('/api/category/list/<int:id>')
def get_category_by_id(id):
    category = Category.query.get_or_404(id)
    return jsonify({
        'id': category.id,
        'name': category.name,
        'description': category.description or '',
        'active': "true",
        'create_at': category.create_at.strftime("%d-%m-%Y %H:%M") if category.create_at else None,
    }), 200


# HELPER FUNCTION
def sql_fetch(category_id: int):
    sql = text(
        "SELECT id, UPPER(SUBSTR(name, 1, 1)) || LOWER(SUBSTR(name, 2)) AS name, "
        "description, create_at FROM category WHERE id = :id"
    )
    result = db.session.execute(sql, {"id": category_id}).fetchone()
    if not result:
        return None
    item = dict(result._mapping)
    if item.get('create_at') and isinstance(item['create_at'], datetime):
        item['create_at'] = item['create_at'].strftime("%Y-%m-%d %H:%M:%S")
    return item


# 3. CREATE CATEGORY (POST)
@app.post('/api/category/create')
@admin_required
def add_category():
    data = request.get_json() or {}
    if 'name' not in data or not data['name'].strip():
        return jsonify({"error": "Category name is required"}), 400

    new_category = Category(
        name=data['name'].strip(),
        description=data.get('description', '').strip(),
        create_at=datetime.now(),
    )
    db.session.add(new_category)
    db.session.commit()

    added_cat = sql_fetch(new_category.id)

    return jsonify({
        'message': 'Category added successfully',
        'category': added_cat
    }), 201


# 4. UPDATE CATEGORY (PUT)
@app.put('/api/category/update')
@admin_required
def update_category():
    data = request.get_json() or {}
    category_id = data.get('category_id')
    if not category_id:
        return jsonify({'error': 'Category ID is required'}), 400

    category = Category.query.get(category_id)
    if not category:
        return jsonify({'error': 'Category not found'}), 404

    new_name = data.get('name')
    if not new_name or not new_name.strip():
        return jsonify({'error': "Category name cannot be empty"}), 400

    category.name = new_name.strip()
    category.description = data.get('description', '').strip()
    db.session.commit()

    category_info = {
        'id': category.id,
        'name': category.name,
        'description': category.description,
        'active': "true",
        'create_at': category.create_at.strftime("%Y-%m-%d %H:%M:%S") if category.create_at else None,
    }
    return jsonify({
        'message': 'Category updated successfully',
        'category': category_info
    }), 200


# 5. DELETE CATEGORY (DELETE)
@app.delete('/api/category/delete')
@admin_required
def delete_category():
    data = request.get_json() or {}
    category_id = data.get('category_id')
    if not category_id:
        return jsonify({'error': 'Category ID is required'}), 400

    category = Category.query.get(category_id)
    if not category:
        return jsonify({'error': f'Category ID: {category_id} not found'}), 404

    category_info = {
        'id': category.id,
        'name': category.name,
        'description': category.description,
    }

    db.session.delete(category)
    db.session.commit()

    return jsonify({
        'message': 'Category deleted successfully',
        'category': category_info
    }), 200