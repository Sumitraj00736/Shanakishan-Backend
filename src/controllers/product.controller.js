const Product = require('../models/Product');
const Category = require('../models/Category');

exports.listCategories = async (req,res) => {
  const cats = await Category.find().sort('name');
  res.json(cats);
};

exports.listProductsByCategory = async (req,res) => {
  const { id } = req.params;
  const products = await Product.find({ categoryId: id, isActive: true });
  res.json(products);
};

exports.searchProducts = async (req,res) => {
  const { q, fromDate, toDate } = req.query;
  const filter = { isActive: true };
  if(q) filter.$or = [{ name: {$regex: q, $options:'i'} }, { description: {$regex: q, $options:'i'} }];
  const products = await Product.find(filter).limit(100);
  // NOTE: availability per date range is computed at booking-time. Optionally add availability checks here.
  res.json(products);
};

exports.getProduct = async (req,res) => {
  const product = await Product.findById(req.params.id);
  if(!product) return res.status(404).json({ message: 'Not found' });
  res.json(product);
};
