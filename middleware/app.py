from flask import Flask, request, jsonify
import psycopg2
import os

app = Flask(__name__)

# Database environment variables
DB_HOST = os.getenv("DB_HOST", "ecommerce-db")
DB_USER = os.getenv("DB_USER", "admin")
DB_PASS = os.getenv("DB_PASS", "admin123")
DB_NAME = os.getenv("DB_NAME", "ordersdb")

# Helper function to connect to Postgres
def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME,
    )

# Health endpoint
@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200

# Place a new order
@app.route("/order", methods=["POST"])
def create_order():
    data = request.json
    item = data.get("item")
    qty = data.get("qty")
    address = data.get("address")
    seller = data.get("seller", "Flipkart")  # default seller

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO orders (item, qty, address, seller) VALUES (%s, %s, %s, %s) RETURNING id;",
        (item, qty, address, seller),
    )
    order_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return jsonify(
        {"order_id": order_id, "item": item, "qty": qty, "address": address, "seller": seller}
    )

# Get all orders
@app.route("/orders", methods=["GET"])
def get_orders():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, item, qty, address, seller FROM orders;")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify([
        {"id": r[0], "item": r[1], "qty": r[2], "address": r[3], "seller": r[4]}
        for r in rows
    ])

if __name__ == "__main__":
    # Flask listens on all interfaces, port 5000
    app.run(host="0.0.0.0", port=5000)
