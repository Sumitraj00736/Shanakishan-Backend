const Category = require('../models/Category');

// List all categories
exports.getAllCategories = async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
};

// Create a new category
exports.createCategory = async (req,res) => {
  const { name } = req.body;
  if(!name) return res.status(400).json({ message: 'Category name is required' });

  const category = await Category.create({ name });
  res.status(201).json({ message: 'Category created', category });
};

// Update a category
exports.updateCategory = async (req,res) => {
  const { id } = req.params;
  const { name } = req.body;

  const category = await Category.findById(id);
  if(!category) return res.status(404).json({ message: 'Category not found' });

  category.name = name || category.name;
  await category.save();
  res.json({ message: 'Category updated', category });
};

// Delete a category
exports.deleteCategory = async (req,res) => {
  const { id } = req.params;
  console.log("HI! I AM CATEGORY")
  const category = await Category.findById(id);
  if(!category) return res.status(404).json({ message: 'Category not found' });

  await category.deleteOne();
  res.json({ message: 'Category deleted' });
};
