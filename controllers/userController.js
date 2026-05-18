const userService = require("../service/userService")

const syncUser = async (req, res) => {
    try {
        const { clerkUserId, nombre, email } = req;
        /* const { clerkUserId } = req; */

        const result = await userService.syncUser(clerkUserId, nombre, email);

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: error.message });

    }
};

module.exports = { syncUser };