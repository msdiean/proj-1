const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();   // Express app
const PORT = 80;
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || "http://middleware:5000";

// Session setup
app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));

// Dummy users
const USERS = {
  admin: "admin123",
  seller: "seller123"
};

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect("/login");
  }
  next();
}

// Root → redirect
app.get("/", (req, res) => {
  if (req.session.username) {
    return res.redirect("/shop");
  }
  res.redirect("/login");
});

// Login page
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Login</title>
      <style>
        body { font-family: Arial; background:#f1f3f6; text-align:center; padding:50px; }
        .login-box { background:white; padding:20px; width:300px; margin:auto; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
        input { width:90%; padding:8px; margin:8px; }
        .btn { padding:10px 20px; background:#2874f0; color:white; border:none; border-radius:5px; cursor:pointer; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h2>🔐 Login</h2>
        <form method="POST" action="/login">
          <input type="text" name="username" placeholder="Username" required><br>
          <input type="password" name="password" placeholder="Password" required><br>
          <button type="submit" class="btn">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Handle login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    req.session.username = username;
    return res.redirect(username === "seller" ? "/seller" : "/shop");
  }
  res.send("<p>❌ Invalid credentials. <a href='/login'>Try again</a></p>");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Product catalog
const products = [
  { name: "Laptop", img: "https://m.media-amazon.com/images/I/71N8M+kRQ9L._SX679_.jpg", price: 60000 },
  { name: "Phone", img: "https://m.media-amazon.com/images/I/81CgtwSII3L._SL1500_.jpg", price: 20000 },
  { name: "Headphones", img: "https://m.media-amazon.com/images/I/61u1VALn6JL._SL1500_.jpg", price: 2000 },
  { name: "Shoes", img: "https://m.media-amazon.com/images/I/71qGUNocV5L._UY500_.jpg", price: 1500 }
];

// Shop page (yellow theme + geolocation)
app.get("/shop", requireLogin, async (req, res) => {
  try {
    const ordersResponse = await axios.get(`${MIDDLEWARE_URL}/orders`);
    const orders = ordersResponse.data;

    const orderList = orders.length
      ? orders.map(o => {
          const product = products.find(p => p.name === o.item);
          const price = product ? product.price : 0;
          const total = price * o.qty;
          return `
            <li>
              🛒 <b>${o.item}</b> × ${o.qty}<br>
              📍 ${o.address || "Unknown"}<br>
              <span style="color:green;">₹${total.toLocaleString()}</span>
            </li><br>`;
        }).join("")
      : "<p>No orders yet.</p>";

    const productCards = products.map(
      p => `
        <div class="card">
          <img src="${p.img}" alt="${p.name}">
          <h3>${p.name}</h3>
          <p style="color:green; font-weight:bold;">₹${p.price.toLocaleString()}</p>
          <form method="POST" action="/order" onsubmit="return fillAddress(this)">
            <input type="hidden" name="item" value="${p.name}">
            <label>Qty:</label>
            <input type="number" name="qty" value="1" min="1" required><br><br>
            <label>Address:</label><br>
            <textarea name="address" rows="2" cols="20" required></textarea><br><br>
            <button type="submit" class="btn">Buy Now</button>
          </form>
        </div>
      `
    ).join("");

    res.send(`
      <html>
      <head>
        <title>Shop</title>
        <style>
          body { font-family: Arial; background:#fdd835; margin:0; padding:0; }
          h1 { text-align:center; background:#ffb300; color:white; padding:15px; }
          .nav { text-align:right; padding:10px; margin-right:20px; }
          .btn { padding:8px 16px; margin:5px; background:#2874f0; color:white; border:none; border-radius:4px; cursor:pointer; }
          .btn:hover { background:#1259c3; }
          .container { display:flex; flex-wrap:wrap; justify-content:center; gap:20px; padding:20px; }
          .card { background:white; border-radius:8px; padding:15px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); width:220px; }
          .card img { width:100%; height:150px; object-fit:contain; }
          .orders { background:white; margin:20px auto; padding:20px; width:60%; border-radius:8px; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
        </style>
      </head>
      <body>
        <h1>🛍️ My Mini Flipkart</h1>
        <div class="nav">
          Welcome, ${req.session.username}! 
          <a href="/seller"><button class="btn">👨‍💼 Seller Dashboard</button></a>
          <a href="/logout"><button class="btn">🚪 Logout</button></a>
        </div>
        <div class="container">${productCards}</div>
        <div class="orders">
          <h2>📦 Your Orders</h2>
          <ul>${orderList}</ul>
        </div>

        <script>
        async function fillAddress(form) {
          const addressBox = form.querySelector("textarea[name='address']");
          
          // If user already typed → allow submit
          if (addressBox.value.trim() !== "") {
            return true;
          }

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;

              try {
                const res = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lon}\`);
                const data = await res.json();

                if (data && data.display_name) {
                  addressBox.value = data.display_name;
                } else {
                  addressBox.value = lat + ", " + lon;
                }
              } catch (e) {
                addressBox.value = lat + ", " + lon;
              }

              form.submit(); // auto-submit after filling
            });

            return false; // stop immediate submit
          } else {
            alert("Geolocation not supported.");
            return true;
          }
        }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<p>Error: ${error.message}</p>`);
  }
});

// Place order
app.post("/order", requireLogin, async (req, res) => {
  try {
    await axios.post(`${MIDDLEWARE_URL}/order`, {
      item: req.body.item,
      qty: parseInt(req.body.qty),
      address: req.body.address
    });
    res.redirect("/shop");
  } catch (error) {
    res.send(`<p>Error placing order: ${error.message}</p>`);
  }
});

// Seller dashboard (blue theme)
app.get("/seller", requireLogin, async (req, res) => {
  try {
    const ordersResponse = await axios.get(`${MIDDLEWARE_URL}/orders`);
    const orders = ordersResponse.data;

    const rows = orders.map(
      o => `<tr><td>${o.id}</td><td>${o.item}</td><td>${o.qty}</td><td>${o.address}</td><td>${o.seller || "Flipkart"}</td></tr>`
    ).join("");

    res.send(`
      <html>
      <head>
        <title>Seller Dashboard</title>
        <style>
          body { font-family: Arial; background:#e3f2fd; padding:20px; margin:0; }
          h1 { text-align:center; background:#2874f0; color:white; padding:15px; }
          .btn { padding:8px 16px; margin:5px; background:#fdd835; color:black; border:none; border-radius:4px; cursor:pointer; }
          table { width:100%; border-collapse:collapse; background:white; margin-top:20px; }
          th, td { border:1px solid #ddd; padding:8px; text-align:left; }
          th { background:#2874f0; color:white; }
        </style>
      </head>
      <body>
        <h1>📦 Seller Dashboard</h1>
        <div style="text-align:right;">
          <a href="/shop"><button class="btn">🛍 Shop</button></a>
          <a href="/logout"><button class="btn">🚪 Logout</button></a>
        </div>
        <table>
          <tr><th>ID</th><th>Item</th><th>Qty</th><th>Address</th><th>Seller</th></tr>
          ${rows}
        </table>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`<p>Error loading seller page: ${error.message}</p>`);
  }
});

app.listen(PORT, () => console.log(`UI running on port ${PORT}`));
