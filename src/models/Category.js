const mongoose = require('mongoose');
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: String,
  description: String,
  image: String
},{ timestamps:true });
module.exports = mongoose.model('Category', CategorySchema);
