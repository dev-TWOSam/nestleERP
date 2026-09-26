const Product = require('../models/products');
const upload = require('../middleware/upload');

exports.createProduct = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if(err)
            return res.status(400).json({ message: 'Error uploading image', error: err.message });
    

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

            //return the new product
            return res.status(201).json({ message: 'Product created successfully', product});

        }catch(error){
            console.error(error);
            return res.status(500).json({ message: 'Error creating product', error: error.message});
        }
    });


};

exports.getAllProducts = async (req, res) => {
    try{
        const products = await Product.find();

        if(!products || products.length === 0)
            return res.status(404).json({ message: 'Products not found' });

        return res.status(200).json({ products });
    }catch(error) {
        console.error(error);
        return res.status(500).json({ message: 'Error retrieving products', error: error.message });
    }
};

exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        if (!category) {
            return res.status(400).json({ message: 'Please provide a category' });
        }

        const products = await Product.find({
            category: { $regex: category, $options: 'i' }
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ message: 'No products found for this category' });
        }

        return res.status(200).json({ products });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Error retrieving products by category',
            error: error.message
        });
    }
};

exports.getProductById = async (req, res) => {
    try{
        //Grab the ID from the req parameter
        const { id } = req.params;

        if(!id)
            return res.status(400).json({ message: 'Please provide the ID' });

        //Search for the product on the DB
        const product = await Product.findById( id );

        //check if the product was found
        if(!product)
            return res.status(404).json({ message: 'Product not found' });

        return res.status(200).json({ product });

    }catch(error){
        console.error(error);
        return res.status(500).json({ message: 'Error retrieving product' });
    }
};

exports.updateProduct = async (req, res) => {
    try{
        //Grab the ID
        const { id } = req.params;

        //check if ID was grabbed
        if(!id)
            res.status(400).json({ message: 'Please provide the ID'});

        //Grab the fields from the request body
        const { name, description, category, price, size, quantity, status, color, image} = req.body;

        //Find and update the product
        const product = await Product.findByIdAndUpdate(
            id,
            {
            name,
            description,
            category,
            price,
            size,
            quantity,
            status,
            color,
            image
            },
            {new: true}
        );

        //Check if product was found
        if(!product)
            return res.status(404).json({ message: 'Product not found' });

        //return the updated product
        return res.status(200).json({ message: 'Product successfully updated', product });

    }catch(error){
        console.error(error);
        return res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try{
        //Grab the product ID
        const { id } = req.params;

        //Check if ID was grabbed
        if (!id) 
            return res.status(400).json({ message: 'Please provide the ID' });
        
        //Find and delete the product
        const product = await Product.findByIdAndDelete( id );

        if (!product)
            return res.status(404).json({ message: 'Product not found' });

        return res.status(200).json({ message: 'Product deleted successfully', product });

    }catch(error){
        console.error(error);
        return res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};