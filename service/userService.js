const userModel = require("../models/userModel")

const syncUser = async (clerkUserId, nombre, email) => {
    let user = await userModel.findOne({ clerkUserId });
    console.log("usuario encontrado:", user);

    if (!user) {
        user = userModel.create({ clerkUserId, nombre, email });
        console.log("usuario creado:", user);
    }

    return { role: user.role };
}

module.exports = { syncUser };