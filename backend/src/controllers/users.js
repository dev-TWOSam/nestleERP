const User = require('../models/users');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Create-user endpoint
exports.createUser = async (req, res) => {
    try {
        //grab the user details
        const {
            firstName,
            lastName,
            gender,
            email,
            password,
            location,
            phone,
            address,
            HasAdminAccess,
            role } = req.body

        //check for missing required fields
        if (!firstName || !lastName || !gender || !email || !password || !location || !phone || !address || !role)
            return res.status(400).json({ message: 'Please complete all fields' });
        
        //check for existing user
        const existingUser = await User.findOne({ email });
        if(existingUser)
            return res.status(400).json({ message: 'A user with this email already exists' });
        
        //Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //create the user document
        const user = await User.create({
            firstName,
            lastName,
            gender,
            email,
            password: hashedPassword,
            location,
            phone,
            address,
            HasAdminAccess: HasAdminAccess || false,
            role
        });

        //remove the password hash from the response before returning
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(201).json({ message: 'User successfully created', user: userResponse });

    }catch(error) {
        console.error(error);
        return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

//Login endpoint
exports.login = async (req, res) => {
    try {
        //Grab the login credentials
        const { email, password } = req.body;

        if(!email || !password)
            return res.status(400).json({ message: 'Please provide all credentials' });

        //find user
        const user = await User.findOne({ email });

        //check if user exists
        if(!user)
            return res.status(404).json({ message: 'Email and password did not match' });
        
        //check if password is correct
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid)
            return res.status(401).json({ message: 'Email and password did not match' });

        //Sign the token
        const token = await jwt.sign({
            id: user._id,
            role: user.role,
            email: user.email},
            process.env.JWT_SECRET,
            {expiresIn: '1h'}
        );

        return res.status(200).json({ token });
    }catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error trying to login', error: error.message });
    }
};