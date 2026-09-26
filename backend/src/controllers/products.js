const Product = require('../models/products');
const upload = require('../middleware/upload');

exports.createProduct = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if(err)
            return res.status(400).json({ message: 'Error uploading image, error: err.message'});
    });

    try{
        //Grab the data from the request body
        const { name, description, category, price, size, quantity, status, color, image} = req.body;

        //check required fields
        if( !name || !description || !category || !price || !size || !quantity || !color)
            return res.status(400).json({ message: 'Please complete all required fields'});

        //Check if image is field is empty
        if( !req.file)
            return res.status(400).json({ message: 'Image fiels can\'t be empty'});

        //Create the product
        const product = await Product.create({
            name,
            description,
            category,
            price,
            size,
            quantity,
            status: status || "In Stock",
            color,
            image: req.file.path
        });

    }catch(error){
        console.error(error);
        return res.status(500).json({ message: 'Error creating product'});
    }


};

exports.getAllProducts = async () => {
    try{
        const products = await Product.find();

        if(!products)
            return res.status(404).json({ message: 'Products not found'});

        return res.status(200).json({ products });
    }catch(error) {
        console.error(error);
        return res.status(500).json({ message: 'Error retrieving products'});
    }
};