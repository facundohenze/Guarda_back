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

const getAllUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getUsersById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUsersById(id);
        return res.status(200).json(user);
    } catch (error) {
        return res.status(404).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params; // id del usuario a actualizar
        const updates = req.body;
        const reqUser = req.user; // viene del roleMiddleware

        const result = await userService.updateUser(id, reqUser, updates);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.message.includes("permisos") ? 403 : 500;
        return res.status(status).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // id del usuario
        const reqUser = req.user; // viene del roleMiddleware

        const result = await userService.deleteUser(id, reqUser);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.message.includes("permisos") ? 403 : 500;
        return res.status(status).json({ error: error.message });
    }
};

const createAdmin = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: "nombre, email y password son requeridos" });
        }

        const reqUser = req.user;
        const newAdmin = await userService.createAdmin(nombre, email, password, reqUser);
        return res.status(201).json(newAdmin);
    } catch (error) {
        const status = error.message.includes("permisos") ? 403
            : error.message.includes("existe") ? 409
                : 500;
        return res.status(status).json({ error: error.message });
    }
};


module.exports = { syncUser, getAllUsers, getUsersById, updateUser, deleteUser, createAdmin };