import os
import uuid
from datetime import datetime
from flask import request, jsonify
from werkzeug.utils import secure_filename
from sqlalchemy import text

from app import app, db
from model import Product
from routes.admin.middleware import admin_required

UPLOAD_FOLDER = 'static/image'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_full_image_url(image_path):
    if not image_path:
        return None
    return request.host_url.rstrip('/') + image_path


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ==========================================
# DASHBOARD SUMMARY STATS FOR PRODUCTS
# ==========================================
@app.get('/api/admin/products/stats')
@admin_required
def get_product_dashboard_stats():
    sql = text("""
        SELECT 
            COUNT(*) AS products_live,
            SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS low_stock_count
        FROM product
    """)
    result = db.session.execute(sql).fetchone()
    data = dict(result._mapping) if result else {"products_live": 0, "low_stock_count": 0}

    return jsonify({
        "products_live": data.get("products_live") or 0,
        "low_stock_count": data.get("low_stock_count") or 0
    }), 200


# ==========================================
# GET PRODUCTS LIST
# ==========================================
@app.get('/api/products')
@app.get('/api/products/list')
def get_products():
    sql = text("""
        SELECT p.id,
               UPPER(SUBSTR(p.name, 1, 1)) || LOWER(SUBSTR(p.name, 2)) AS product_name,
               p.price,
               p.stock,
               p.description,
               p.image,
               p.category_id,
               c.name AS category_name,
               p.create_at
        FROM product AS p
        LEFT JOIN category AS c ON p.category_id = c.id
        ORDER BY p.id DESC
    """)

    result = db.session.execute(sql).fetchall()

    rows = []
    total_price = 0.0
    total_stock = 0
    categories = set()

    for row in result:
        r = dict(row._mapping)
        r['image'] = get_full_image_url(r['image']) if r['image'] else None
        r['price'] = float(r['price']) if r['price'] is not None else 0.0

        total_price += r['price']
        total_stock += r['stock'] if r['stock'] else 0
        if r['category_name']:
            categories.add(r['category_name'])

        rows.append(r)

    return jsonify({
        "total_products": len(rows),
        "total_categories": len(categories),
        "total_price": round(total_price, 2),
        "total_stock": total_stock,
        "products": rows
    }), 200


# ==========================================
# GET PRODUCT BY ID
# ==========================================
@app.get('/api/products/list/<int:id>')
def get_product_by_id(id):
    sql = text("""
        SELECT p.id, 
               UPPER(SUBSTR(p.name, 1, 1)) || LOWER(SUBSTR(p.name, 2)) as product_name, 
               p.price, 
               p.stock, 
               p.description, 
               p.image, 
               p.category_id,
               c.name as category_name
        FROM product AS p
        LEFT JOIN category AS c ON p.category_id = c.id
        WHERE p.id = :id
    """)
    row = db.session.execute(sql, {'id': id}).fetchone()
    if not row:
        return jsonify({'error': 'Product not found'}), 404

    r = dict(row._mapping)
    r['price'] = float(r['price']) if r['price'] is not None else 0.0
    r['image'] = get_full_image_url(r['image']) if r['image'] else None

    return jsonify(r), 200


# ==========================================
# CREATE PRODUCT
# ==========================================
@app.post('/api/admin/products/create')
@admin_required
def create_products():
    name = request.form.get('name')
    price = request.form.get('price')
    stock = request.form.get('stock')
    description = request.form.get('description')
    category_id = request.form.get('category_id')

    if not name:
        return jsonify({'error': 'No product name provided'}), 400
    if not price:
        return jsonify({'error': 'No price provided'}), 400
    if not stock:
        return jsonify({'error': 'No stock provided'}), 400
    if not category_id:
        return jsonify({'error': 'No category_id provided'}), 400

    try:
        price = float(price)
        stock = int(stock)
        category_id = int(category_id)
    except ValueError:
        return jsonify({'error': 'Invalid numeric value'}), 400

    image_url = None
    if 'image_url' in request.files:
        image = request.files['image_url']
        if image and image.filename != '':
            if allowed_file(image.filename):
                filename = f"{uuid.uuid4().hex}_{secure_filename(image.filename)}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                image.save(file_path)
                image_url = f"/static/image/{filename}"
            else:
                return jsonify({'error': 'Invalid image file type'}), 400

    now = datetime.now()
    sql = text("""
        INSERT INTO product (name, price, stock, description, image, category_id, create_at)
        VALUES (:name, :price, :stock, :description, :image, :category_id, :create_at)
    """)
    db.session.execute(sql, {
        "name": name,
        "price": price,
        "stock": stock,
        "description": description,
        "image": image_url,
        "category_id": category_id,
        "create_at": now
    })
    db.session.commit()

    return jsonify({
        'message': 'Product created successfully',
        'product': {
            "name": name,
            "price": price,
            "stock": stock,
            "description": description,
            "image": get_full_image_url(image_url),
            "category_id": category_id,
            "create_at": now.strftime("%d-%m-%Y")
        }
    }), 201


# ==========================================
# UPDATE PRODUCT (Fixed ISO Format Error)
# ==========================================
@app.put('/api/admin/products/update/<int:id>')
@admin_required
def update_product(id):
    try:
        # ១. ឆ្ដេកមើលទិន្នន័យចាស់ដោយប្រើ Raw SQL ផ្តាច់មុខ (ជៀសវាង ORM Mapping ជាមួយ Product Model)
        check_sql = text("SELECT id, image FROM product WHERE id = :id")
        existing_product = db.session.execute(check_sql, {'id': id}).fetchone()
        if not existing_product:
            return jsonify({'error': 'Product not found'}), 404

        current_image = existing_product._mapping['image']

        # ២. អានតម្លៃពី Request Form
        name = request.form.get('name')
        price = request.form.get('price')
        stock = request.form.get('stock')
        description = request.form.get('description')
        category_id = request.form.get('category_id')

        if not name or not price or not stock or not category_id:
            return jsonify({'error': 'Missing required fields'}), 400

        try:
            price = float(price)
            stock = int(stock)
            category_id = int(category_id)
        except ValueError:
            return jsonify({'error': 'Invalid numeric value for price, stock, or category'}), 400

        # ៣. ចាត់ចែងរឿង Upload រូបភាពថ្មី និងលុបរូបចាស់
        image_url = current_image
        if 'image_url' in request.files:
            image = request.files['image_url']
            if image and image.filename != '':
                if allowed_file(image.filename):
                    if current_image:
                        try:
                            old_image_path = current_image.lstrip('/')
                            if os.path.exists(old_image_path):
                                os.remove(old_image_path)
                        except Exception as img_err:
                            print(f"Warning: Could not remove old image: {img_err}")

                    filename = f"{uuid.uuid4().hex}_{secure_filename(image.filename)}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    image.save(file_path)
                    image_url = f"/static/image/{filename}"
                else:
                    return jsonify({'error': 'Invalid image file type'}), 400

        # ៤. ធ្វើការ Update ដោយប្រើប្រាស់ Raw SQL Query ផ្ទាល់
        update_sql = text("""
            UPDATE product 
            SET name = :name, 
                price = :price, 
                stock = :stock, 
                description = :description, 
                image = :image, 
                category_id = :category_id
            WHERE id = :id
        """)

        db.session.execute(update_sql, {
            "id": id,
            "name": name,
            "price": price,
            "stock": stock,
            "description": description,
            "image": image_url,
            "category_id": category_id
        })
        db.session.commit()

        return jsonify({
            'message': 'Product updated successfully',
            'product': {
                'id': id,
                'name': name,
                'price': price,
                'stock': stock,
                'description': description,
                'image': get_full_image_url(image_url),
                'category_id': category_id
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal Server Error: {str(e)}'}), 500


# ==========================================
# DELETE PRODUCT
# ==========================================
@app.delete('/api/admin/products/delete')
@admin_required
def delete_product():
    try:
        data = request.get_json() or {}
        product_id = data.get('product_id')

        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400

        check_sql = text("SELECT id, image FROM product WHERE id = :id")
        existing_product = db.session.execute(check_sql, {'id': product_id}).fetchone()

        if not existing_product:
            return jsonify({'error': f'Product with ID {product_id} not found'}), 404

        current_image = existing_product._mapping['image']

        if current_image:
            try:
                image_path = current_image.lstrip('/')
                if os.path.exists(image_path):
                    os.remove(image_path)
            except Exception as img_err:
                print(f"Warning: Could not remove image file: {img_err}")

        delete_sql = text("DELETE FROM product WHERE id = :id")
        db.session.execute(delete_sql, {'id': product_id})
        db.session.commit()

        return jsonify({
            'message': 'Product deleted successfully',
            'product_id': product_id
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal Server Error: {str(e)}'}), 500