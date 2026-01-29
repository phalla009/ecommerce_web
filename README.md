# 🛒 Flask E-Commerce System

A robust, full-stack E-commerce backend solution built with Python and the Flask web framework. This system provides a complete RESTful API for managing products, user accounts, shopping carts, and secure payment processing.

---

## 🌟 Features

### 👤 Customer Experience
* **Secure Auth:** User registration and login powered by **Flask-JWT-Extended**.
* **Product Discovery:** Browse, search, and filter products by category.
* **Shopping Cart:** Add, remove, and update item quantities with persistent storage.
* **Seamless Checkout:** Integrated with **Stripe API** for secure credit card transactions.
* **Order History:** Users can track their previous purchases and order status.

### 🛠 Administrative Tools
* **Inventory Control:** Full CRUD (Create, Read, Update, Delete) operations for products.
* **Order Management:** Dashboard to view all customer transactions and shipping status.
* **Access Control:** Role-based permissions (User vs. Admin) to protect sensitive endpoints.

---

## 🛠 Tech Stack

| Component      | Technology                                    |
| :------------- | :-------------------------------------------- |
| **Framework** | [Flask](https://flask.palletsprojects.com/)   |
| **Database** | PostgreSQL (Prod) / SQLite (Dev)             |
| **ORM** | [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/) |
| **Migrations** | [Flask-Migrate](https://flask-migrate.readthedocs.io/) |
| **Security** | JWT (JSON Web Tokens) & Passlib (Bcrypt)      |
| **Payments** | [Stripe SDK](https://stripe.com/docs/api)     |
| **Validation** | Marshmallow                                   |

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.9+
* Pip (Python Package Manager)
* Stripe API Keys (Sign up at [Stripe.com](https://stripe.com))

### 2. Installation
```bash
# Clone the repository
git clone [https://github.com/yourusername/flask-ecommerce.git](https://github.com/yourusername/flask-ecommerce.git)
cd flask-ecommerce

# Create a virtual environment
python -m venv venv

# Activate the environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

### 3. Database Initialization
```Bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
