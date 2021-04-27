require('dotenv').config();
const express = require('express');
const cors = require('cors');
const methodOverride = require('method-override');
const pg = require('pg');
const superagent = require('superagent');

// server config

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.LOCALLY ? false : { rejectUnauthorized: false },
});
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static('./public'));
app.set('view engine', 'ejs');

// routes
app.get('/test', (req, res, next) => {
  res.send('The app is working');
});

app.get('/', handleHomePage);
app.post('/getresult', handleGetResult);
app.get('/all', handleAllProductsPage);
app.post('/add', handleAddProduct);
app.get('/mycart', handleMyCartPage);
app.get('/product/:id', handleProductDetailsPage);
app.delete('/product/:id', handleDeleteProduct);
app.put('/product/:id', handleUpdateProduct);

// routes handlers

function handleHomePage(req, res, next) {
  res.render('pages/index');
}

function handleGetResult(req, res, next) {
  const { brand, from, to } = req.body;
  let url = `http://makeup-api.herokuapp.com/api/v1/products.json?brand=${brand}&price_greater_than=${from}&price_less_than=${to}`;
  superagent
    .get(url)
    .then((data) => {
      let products = data.body.map((item) => new Product(item));
      res.render('pages/getResult', { products: products });
    })
    .catch((e) => console.log(e));
}

function handleAllProductsPage(req, res, next) {
  const { brand, from, to } = req.body;
  let url =
    'http://makeup-api.herokuapp.com/api/v1/products.json?brand=maybelline';
  superagent
    .get(url)
    .then((data) => {
      let products = data.body.map((item) => new Product(item));
      res.render('pages/allProducts', { products: products });
    })
    .catch((e) => console.log(e));
}

function handleMyCartPage(req, res, next) {
  let sqlQuery = 'SELECT * FROM product;';
  client
    .query(sqlQuery)
    .then((data) => {
      res.render('pages/myCart', { products: data.rows });
    })
    .catch((e) => console.log(e));
}

function handleAddProduct(req, res, next) {
  const { name, image, price, description } = req.body;
  let sqlQuery =
    'INSERT INTO product (name, image, price, description) VALUES ($1, $2, $3, $4);';
  client
    .query(sqlQuery, [name, image, price, description])
    .then(res.redirect('/myCart'))
    .catch((e) => console.log(e));
}

function handleProductDetailsPage(req, res, next) {
  let id = req.params.id;
  let sqlQuery = 'SELECT * FROM product WHERE id=$1;';

  client
    .query(sqlQuery, [id])
    .then((data) => {
      res.render('pages/product', { product: data.rows[0] });
    })
    .catch((e) => console.log(e));
}

function handleDeleteProduct(req, res, next) {
  let id = req.params.id;
  let sqlQuery = 'DELETE FROM product WHERE id=$1;';

  client
    .query(sqlQuery, [id])
    .then((data) => {
      res.redirect('/myCart');
    })
    .catch((e) => console.log(e));
}

function handleUpdateProduct(req, res, next) {
  let id = req.params.id;
  const { name, image, price, description } = req.body;
  let sqlQuery =
    'UPDATE product SET name=$1, image=$2, price=$3, description=$4 WHERE id=$5;';
  client
    .query(sqlQuery, [name, image, price, description, id])
    .then((data) => {
      res.redirect(`/product/${id}`);
    })
    .catch((e) => console.log(e));
}

// Constructors

function Product(data) {
  this.name = data.name;
  this.price = data.price;
  this.image = data.image_link;
  this.description = data.description;
}

// start the server
client
  .connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Server is running on ${PORT}`));
  })
  .catch((e) => console.log(e));
