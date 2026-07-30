from flask import Flask, jsonify, render_template
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config['JWT_SECRET_KEY'] = "8f3G7!k2Lp#4vQx9ZrT0wE1sH6yA5bJk"

db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

import model
import routes

@app.route('/api')
def hello_world():
    return jsonify({
        "status": "ok",
        "message": "API is running"
    })

# Admin Login Route
@app.route('/')
@app.route('/admin/login')
def login_page():
    return render_template('admin/login/login.html', active_page='login')

# Dashboard Route

@app.route('/admin/dashboard')
def dashboard():
    return render_template('admin/index.html', active_page='dashboard')

# Categories Route
@app.route('/admin/catalogs/category')
def categories():
    return render_template('admin/catalogs/category/category.html', active_page='categories')

# Products Route
@app.route('/admin/catalogs/products')
def products():
    return render_template('admin/catalogs/product/products.html', active_page='products')

# Users Route
@app.route('/admin/users')
def users():
    return render_template('admin/user/user.html', active_page='users')

if __name__ == '__main__':
    app.run(debug=True)