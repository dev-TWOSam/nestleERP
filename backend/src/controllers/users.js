const User = require("../models/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

//Create-user endpoint
exports.createUser = async (req, res) => {
  try {
    // Check if all required fields are provided
    if (
      !req.body.firstName ||
      !req.body.lastName ||
      !req.body.gender ||
      !req.body.email ||
      !req.body.password ||
      !req.body.location ||
      !req.body.phoneCountryCode ||
      !req.body.phone ||
      !req.body.address
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    if (
      typeof req.body.firstName !== "string" ||
      typeof req.body.lastName !== "string" ||
      typeof req.body.email !== "string" ||
      typeof req.body.password !== "string" ||
      typeof req.body.phoneCountryCode !== "string" ||
      typeof req.body.phone !== "string" ||
      typeof req.body.address !== "string"
    ) {
      return res.status(400).json({
        message: "Invalid data format. Fields must be strings",
      });
    }

    // Validate the name field to ensure it only contains letters, spaces, hyphens, and apostrophes, and is between 2 and 50 characters long
    const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
    if (!nameRegex.test(req.body.firstName.trim())) {
      return res.status(400).json({
        message:
          "First name must be between 2 and 50 characters and can only contain letters, spaces, hyphens, and apostrophes",
      });
    }
    if (!nameRegex.test(req.body.lastName.trim())) {
      return res.status(400).json({
        message:
          "Last name must be between 2 and 50 characters and can only contain letters, spaces, hyphens, and apostrophes",
      });
    }

    // Validate the email format using a regular expression
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({
        message:
          "Please provide a valid email address (e.g., example@domain.com).",
      });
    }

    if (req.body.password.length < 12 || req.body.password.length > 30) {
      return res.status(400).json({
        message: "Password must be between 12 and 30 characters long",
      });
    }

    // Validate the password to ensure it contains at least one uppercase letter, one lowercase letter, one digit, and one special character
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&_])[A-Za-z\d@#$!%*?&_]{12,30}$/;
    if (!passwordRegex.test(req.body.password)) {
      return res.status(400).json({
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).",
      });
    }

    // Combine the country code and phone number, and remove any spaces
    const fullPhoneNumber = (
      req.body.phoneCountryCode + req.body.phone
    ).replace(/\s+/g, "");

    // Validate the phone number format to ensure it includes the country code and is in a valid international format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(fullPhoneNumber)) {
      // removes spaces before testing
      return res.status(400).json({
        message:
          "Please provide a valid phone number, including country code (e.g., +234...).",
      });
    }

    // Check if the email or phone number already exists in the database
    const existingUser = await User.findOne({
      $or: [{ email: req.body.email }, { phone: fullPhoneNumber }],
    });
    // If an existing user is found, check which field is duplicated and return an appropriate message
    if (existingUser) {
      if (existingUser.email === req.body.email) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (existingUser.phone === fullPhoneNumber) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    // Hash the password before saving the user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    // Create a new user instance with the provided data and hashed password
    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: fullPhoneNumber, // Use the full phone number with country code
      password: hashedPassword,
      gender: req.body.gender,
      location: req.body.location,
      address: req.body.address,
      role: "user", // Default role is set to "user" for all new users
      HasAdminAccess: false, // Default value for HasAdminAccess is set to false for all new users
    });

    await user.save();
    // Create a response object that excludes the password field before sending it back to the client
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};

// Search User by First Name or Last Name, Email, or ID endpoint
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== "string" || !q.trim()) {
      return res
        .status(400)
        .json({ message: "Please provide a valid search item" });
    }

    const searchterm = q.trim();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1) {
      return res
        .status(400)
        .json({ message: "Page number must be greater than 0" });
    }

    if (limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ message: "Limit must be between 1 and 100" });
    }

    const skip = (page - 1) * limit;
    const searchConditions = [
      { firstName: { $regex: searchterm, $options: "i" } },
      { lastName: { $regex: searchterm, $options: "i" } },
      { email: { $regex: searchterm, $options: "i" } },
    ];
    if (/^[0-9a-fA-F]{24}$/.test(searchterm)) {
      searchConditions.push({ _id: searchterm });
    }

    const searchQuery = { $or: searchConditions };

    const totalUsers = await User.countDocuments(searchQuery);

    const totalPages = Math.ceil(totalUsers / limit);

    if (totalUsers === 0) {
      return res
        .status(404)
        .json({ message: "No users found matching the search criteria" });
    }

    if (page > totalPages) {
      return res.status(400).json({
        message: "Page number exceeds total pages",
        currentPage: page,
        totalPages,
      });
    }

    const users = await User.find(searchQuery)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ firstName: 1 });

    return res.status(200).json({
      count: users.length,
      totalUsers,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      message: "Error searching users",
      error: error.message,
    });
  }
};

//Login endpoint
exports.login = async (req, res) => {
  try {
    if (!req.body.email || !req.body.password)
      return res
        .status(400)
        .json({ message: "Kindly input your email and password" });

    if (
      typeof req.body.email !== "string" ||
      typeof req.body.password !== "string"
    )
      return res
        .status(400)
        .json({ message: "Invalid data format. Fields must be strings" });

    //find user
    const user = await User.findOne({ email: req.body.email });

    //check if user exists
    if (!user)
      return res.status(404).json({ message: "Invalid email or password" });

    //check if password is correct
    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      user.password,
    );

    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid email or password" });

    //Sign the token
    const token = await jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.error("Error trying to login:", error);
    return res
      .status(500)
      .json({ message: "Error trying to login", error: error.message });
  }
};

// Get-all-users endpoint
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude the password field from the response
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }
    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "Error retrieving users", error: error.message });
  }
};

// Get-user-by-ID endpoint
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    const user = await User.findById(id).select("-password"); // Exclude the password field from the response
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ message: "Error retrieving user", error: error.message });
  }
};

// Update-user endpoint
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    if (
      (req.body.firstName && typeof req.body.firstName !== "string") ||
      (req.body.lastName && typeof req.body.lastName !== "string") ||
      (req.body.email && typeof req.body.email !== "string") ||
      (req.body.phoneCountryCode &&
        typeof req.body.phoneCountryCode !== "string") ||
      (req.body.phone && typeof req.body.phone !== "string") ||
      (req.body.location && typeof req.body.location !== "string") ||
      (req.body.address && typeof req.body.address !== "string")
    ) {
      return res
        .status(400)
        .json({ message: "Invalid data format. Input values must be strings" });
    }

    // Check if the user exists before attempting to update
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    let updatedPhone = user.phone; // Default to existing phone number
    if (req.body.phoneCountryCode || req.body.phone) {
      const phoneCountryCode = req.body.phoneCountryCode || "";
      const phone = req.body.phone || "";
      updatedPhone = (phoneCountryCode + phone).replace(/\s+/g, "");
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(updatedPhone)) {
      return res.status(400).json({
        message:
          "Please provide a valid phone number, including country code (e.g., +234...).",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: updatedPhone,
        location: req.body.location,
        address: req.body.address,
      },
      { new: true, runValidators: true },
    ).select("-password"); // Exclude the password field from the response
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    return res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};

// Delete-user by-ID endpoint
exports.deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Please provide the ID" });

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
};
