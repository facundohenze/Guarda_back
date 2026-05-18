const userService = require("../service/userService")

const syncUser = async (req, res) => {
    try {
        const clerkUserId = req.clerkUserId;
        const { nombre, email } = req.body || {};
        /* const { clerkUserId } = req; */

        const result = await userService.syncUser(clerkUserId, nombre, email);

        return res.status(200).json(result);

    } catch (error) {
        return res.status(500).json({ error: error.message });

    }
};

module.exports = { syncUser };