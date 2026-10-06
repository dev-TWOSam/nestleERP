const mongoose = require("mongoose");
const User = require("../models/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sendStaffCredentials } = require("../utils/sendEmail");
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
      {
  expiresIn:
    process.env.JWT_EXPIRES_IN ||
    "1h",
}
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
// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // =====================================
    // VALIDATE ID
    // =====================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please provide the user ID",
        data: null,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
        data: null,
      });
    }

    // =====================================
    // FIND USER
    // =====================================

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
    }

    // =====================================
    // PREVENT OWN ROLE CHANGE
    // =====================================

    if (
      req.body.role &&
      req.user?.id === id
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot change your own role from this account",
        data: null,
      });
    }

    // =====================================
    // UPDATE DATA
    // =====================================

    const updateData = {};

    // =====================================
    // FIRST NAME
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "firstName",
      )
    ) {
      if (
        typeof req.body.firstName !== "string" ||
        !req.body.firstName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "First name must be a valid string",
          data: null,
        });
      }

      updateData.firstName =
        req.body.firstName.trim();
    }

    // =====================================
    // LAST NAME
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "lastName",
      )
    ) {
      if (
        typeof req.body.lastName !== "string" ||
        !req.body.lastName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Last name must be a valid string",
          data: null,
        });
      }

      updateData.lastName =
        req.body.lastName.trim();
    }

    // =====================================
    // EMAIL
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "email",
      )
    ) {
      const email =
        String(req.body.email)
          .trim()
          .toLowerCase();

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
          data: null,
        });
      }

      const existingEmailUser =
        await User.findOne({
          email,
          _id: { $ne: id },
        });

      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
          data: null,
        });
      }

      updateData.email = email;
    }

    // =====================================
    // PHONE
    // =====================================

    if (
      req.body.phoneCountryCode !== undefined ||
      req.body.phone !== undefined
    ) {
      const countryCode =
        req.body.phoneCountryCode !== undefined
          ? String(req.body.phoneCountryCode).trim()
          : "";

      const phone =
        req.body.phone !== undefined
          ? String(req.body.phone).trim()
          : "";

      const updatedPhone =
        `${countryCode}${phone}`.replace(
          /\s+/g,
          "",
        );

      const phoneRegex =
        /^\+?[1-9]\d{1,14}$/;

      if (!phoneRegex.test(updatedPhone)) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid phone number including country code",
          data: null,
        });
      }

      const existingPhoneUser =
        await User.findOne({
          phone: updatedPhone,
          _id: { $ne: id },
        });

      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message: "Phone number already exists",
          data: null,
        });
      }

      updateData.phone =
        updatedPhone;
    }

    // =====================================
    // LOCATION
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "location",
      )
    ) {
      const location =
        String(req.body.location).trim();

      const allowedLocations =
        User.schema.path("location").enumValues;

      if (
        !allowedLocations.includes(
          location,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid Nigerian state or the FCT",
          data: null,
        });
      }

      updateData.location =
        location;
    }

    // =====================================
    // ADDRESS
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "address",
      )
    ) {
      const address =
        String(req.body.address).trim();

      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Address cannot be empty",
          data: null,
        });
      }

      updateData.address =
        address;
    }

    // =====================================
    // ROLE
    // =====================================

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "role",
      )
    ) {
      const allowedRoles = [
        "user",
        "inventory-manager",
        "super-admin",
      ];

      const requestedRole =
        String(req.body.role).trim();

      if (
        !allowedRoles.includes(
          requestedRole,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Role must be user, inventory-manager, or super-admin",
          data: null,
        });
      }

      updateData.role =
        requestedRole;

      /*
       * Do not trust HasAdminAccess
       * from the frontend.
       *
       * Derive it from the role.
       */

      updateData.HasAdminAccess =
        requestedRole !== "user";
    }

    // =====================================
    // NOTHING TO UPDATE
    // =====================================

    if (
      Object.keys(updateData).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No valid fields were provided for update",
        data: null,
      });
    }

    // =====================================
    // UPDATE USER
    // =====================================

    const updatedUser =
      await User.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      ).select("-password");

    // =====================================
    // SUCCESS
    // =====================================

    return res.status(200).json({
      success: true,
      message: "User updated successfully",

      data: {
        user: updatedUser,
      },

      /*
       * Temporary compatibility
       * with the current dashboard.
       */
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Error updating user:",
      error,
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      const firstError =
        Object.values(
          error.errors || {},
        )[0];

      return res.status(400).json({
        success: false,
        message:
          firstError?.message ||
          "Invalid user data",
        data: null,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Email or phone number already exists",
        data: null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error updating user",
      data: null,
    });
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
exports.createStaff = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      email,
      password,
      location,
      phoneCountryCode,
      phone,
      address,
      role,
    } = req.body;

    // =====================================
    // REQUIRED FIELDS
    // =====================================

    if (
      !firstName ||
      !lastName ||
      !gender ||
      !email ||
      !password ||
      !location ||
      !phoneCountryCode ||
      !phone ||
      !address ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: "All staff fields are required",
        data: null,
      });
    }

    // =====================================
    // VALIDATION RULES
    // =====================================

    const nameRegex =
      /^[a-zA-Z\s\-']{2,50}$/;

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&_])[A-Za-z\d@#$!%*?&_]{12,30}$/;

    const phoneRegex =
      /^\+?[1-9]\d{1,14}$/;

    const allowedRoles = [
      "inventory-manager",
      "super-admin",
    ];

    const allowedGenders = [
      "Male",
      "Female",
    ];

    // =====================================
    // NORMALIZE VALUES
    // =====================================

    const cleanFirstName =
      String(firstName).trim();

    const cleanLastName =
      String(lastName).trim();

    const cleanEmail =
      String(email)
        .trim()
        .toLowerCase();

    const cleanGender =
      String(gender).trim();

    const cleanLocation =
      String(location).trim();

    const cleanAddress =
      String(address).trim();

    const cleanRole =
      String(role).trim();

    // =====================================
    // NAME VALIDATION
    // =====================================

    if (
      !nameRegex.test(
        cleanFirstName,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "First name must be between 2 and 50 characters and can only contain letters, spaces, hyphens, and apostrophes",

        data: null,
      });
    }

    if (
      !nameRegex.test(
        cleanLastName,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Last name must be between 2 and 50 characters and can only contain letters, spaces, hyphens, and apostrophes",

        data: null,
      });
    }

    // =====================================
    // EMAIL VALIDATION
    // =====================================

    if (
      !emailRegex.test(
        cleanEmail,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid email address",
        data: null,
      });
    }

    // =====================================
    // PASSWORD VALIDATION
    // =====================================

    if (
      !passwordRegex.test(
        String(password),
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Password must be 12-30 characters and contain uppercase, lowercase, number, and special character (@$!%*?&_)",

        data: null,
      });
    }

    // =====================================
    // ROLE VALIDATION
    // =====================================

    if (
      !allowedRoles.includes(
        cleanRole,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Role must be inventory-manager or super-admin",

        data: null,
      });
    }

    // =====================================
    // GENDER VALIDATION
    // =====================================

    if (
      !allowedGenders.includes(
        cleanGender,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Gender must be Male or Female",
        data: null,
      });
    }

    // =====================================
    // LOCATION VALIDATION
    // =====================================

    const allowedLocations =
      User.schema.path(
        "location",
      ).enumValues;

    if (
      !allowedLocations.includes(
        cleanLocation,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please select a valid Nigerian state or the FCT",

        data: null,
      });
    }

    // =====================================
    // ADDRESS VALIDATION
    // =====================================

    if (!cleanAddress) {
      return res.status(400).json({
        success: false,
        message:
          "Address is required",
        data: null,
      });
    }

    // =====================================
    // PHONE NUMBER
    // =====================================

    const fullPhoneNumber =
      `${String(
        phoneCountryCode,
      ).trim()}${String(
        phone,
      ).trim()}`.replace(
        /\s+/g,
        "",
      );

    if (
      !phoneRegex.test(
        fullPhoneNumber,
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Please provide a valid phone number including country code (for example +234...)",

        data: null,
      });
    }

    // =====================================
    // CHECK EXISTING EMAIL / PHONE
    // =====================================

    const existingUser =
      await User.findOne({
        $or: [
          {
            email:
              cleanEmail,
          },

          {
            phone:
              fullPhoneNumber,
          },
        ],
      });

    if (existingUser) {
      const message =
        existingUser.email ===
        cleanEmail
          ? "Email already exists"
          : "Phone number already exists";

      return res.status(409).json({
        success: false,
        message,
        data: null,
      });
    }

    // =====================================
    // HASH TEMPORARY PASSWORD
    // =====================================

    const salt =
      await bcrypt.genSalt(
        10,
      );

    const hashedPassword =
      await bcrypt.hash(
        String(password),
        salt,
      );

    // =====================================
    // CREATE STAFF ACCOUNT
    // =====================================

    const staff =
      await User.create({
        firstName:
          cleanFirstName,

        lastName:
          cleanLastName,

        gender:
          cleanGender,

        email:
          cleanEmail,

        password:
          hashedPassword,

        location:
          cleanLocation,

        phone:
          fullPhoneNumber,

        address:
          cleanAddress,

        role:
          cleanRole,

        HasAdminAccess:
          true,
      });

    // =====================================
    // SEND LOGIN CREDENTIALS
    // =====================================

    let emailSent =
      true;

    try {
      await sendStaffCredentials({
        email:
          cleanEmail,

        name:
          `${cleanFirstName} ${cleanLastName}`,

        password:
          String(password),

        role:
          cleanRole,
      });
    } catch (emailError) {
      /*
       * Do not report account creation
       * as failed just because SMTP
       * failed after the user was
       * already saved.
       */

      emailSent =
        false;

      console.error(
        "Staff account created but credentials email failed:",
        emailError,
      );
    }

    // =====================================
    // REMOVE PASSWORD FROM RESPONSE
    // =====================================

    const staffResponse =
      staff.toObject();

    delete staffResponse.password;

    // =====================================
    // ROLE LABEL
    // =====================================

    const roleLabel =
      cleanRole ===
      "super-admin"
        ? "Super Admin"
        : "Inventory Manager";

    // =====================================
    // RESPONSE
    // =====================================

    return res.status(201).json({
      success: true,

      message:
        emailSent
          ? `${roleLabel} created successfully and credentials email sent`
          : `${roleLabel} created successfully, but the credentials email could not be sent`,

      data: {
        staff:
          staffResponse,

        emailSent,
      },
    });
  } catch (error) {
    console.error(
      "Error creating staff:",
      error,
    );

    // Mongoose validation
    if (
      error?.name ===
      "ValidationError"
    ) {
      const firstError =
        Object.values(
          error.errors ||
            {},
        )[0];

      return res.status(400).json({
        success: false,

        message:
          firstError?.message ||
          "Invalid staff data",

        data: null,
      });
    }

    // Duplicate key
    if (
      error?.code ===
      11000
    ) {
      return res.status(409).json({
        success: false,

        message:
          "Email or phone number already exists",

        data: null,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create staff",
      data: null,
    });
  }
};