const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");


const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      categoryId,
      description,
      features,
      totalUnits,
      maintenanceUnits,
      basePrice,
      memberPrice,
      refundableDeposit,
      isActive,
    } = req.body;

    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Product name is required" });
    if (!totalUnits || totalUnits <= 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "Total units must be greater than 0",
        });
    if (!basePrice || basePrice <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Base price must be greater than 0" });
    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid categoryId" });

    // Upload images to Cloudinary
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      imageUrls = uploadResults.map((r) => r.secure_url);
    }

    const product = await Product.create({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      categoryId: categoryId || null,
      description: description || "",
      features: Array.isArray(features) ? features : [],
      images: imageUrls,
      totalUnits,
      maintenanceUnits: maintenanceUnits || 0,
      basePrice,
      memberPrice: memberPrice || null,
      refundableDeposit: refundableDeposit || 0,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Product created successfully",
        product,
      });
  } catch (err) {
    console.error("Error creating product:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

exports.listCategories = async (req, res) => {
  const cats = await Category.find().sort("name");
  res.json(cats);
};

exports.listProductsByCategory = async (req, res) => {
  const { id } = req.params;
  const products = await Product.find({ categoryId: id, isActive: true });
  res.json(products);
};

exports.searchProducts = async (req, res) => {
  const { q, fromDate, toDate } = req.query;
  const filter = { isActive: true };
  if (q)
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  const products = await Product.find(filter).limit(100);
  // NOTE: availability per date range is computed at booking-time. Optionally add availability checks here.
  res.json(products);
};

exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Not found" });
  res.json(product);
};
