const { createClerkClient } = require("@clerk/backend")
const userModel = require("../models/userModel");

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

const syncUser = async (clerkUserId, nombre, email) => {
    let user = await userModel.findOne({ clerkUserId });
    console.log("usuario encontrado:", user);

    if (!user) {
        /* solucion al problema de que el nombre y apellido venian con null */
        // Si nombre o email no vienen, intentar obtenerlos desde Clerk
        if (!nombre || !email) {
            try {
                const clerkUser = await clerk.users.getUser(clerkUserId)
                const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress || null
                email = email || clerkEmail
                const firstName = clerkUser.firstName || clerkUser.first_name || ''
                const lastName = clerkUser.lastName || clerkUser.last_name || ''
                const fullName = clerkUser.fullName || clerkUser.full_name || `${firstName} ${lastName}`.trim()
                nombre = nombre || fullName || (email ? email.split('@')[0] : null)
            } catch (err) {
                console.log("Error al obtener usuario de Clerk:", err.message)
            }
        }

        user = await userModel.create({ clerkUserId, nombre, email });
        console.log("usuario creado:", user);
    }

    return { role: user.role };
};

const getAllUsers = async () => {
    const users = await userModel.find()
    return users;
}

const getUsersById = async (userId) => {
    const user = await userModel.findById(userId)
    if (!user) throw new Error("Usuario no encontrado");
    return user;
}

/* reqUser = usuario autenticado */
const updateUser = async (targetUserId, reqUser, updates) => {
    const targetUser = await userModel.findById(targetUserId);
    if (!targetUser) throw new Error("Usuario no encontrado");

    const isSuperAdmin = reqUser.role === "superadmin";
    const isOwner = reqUser._id.toString() === targetUserId;

    if (!isSuperAdmin && !isOwner) {
        throw new Error("No tenés permisos para editar este usuario");
    }

    // solo superadmin puede cambiar el rol
    if (updates.role && !isSuperAdmin) {
        throw new Error("No tenés permisos para cambiar el rol");
    }

    // campos permitidos según rol
    const allowedFields = isSuperAdmin
        ? ["nombre", "role"] /* admins */
        : ["nombre"]; /* user */

    allowedFields.forEach((field) => {
        if (updates[field] !== undefined) {
            targetUser[field] = updates[field];
        }
    });

    await targetUser.save();
    return targetUser;
};

const deleteUser = async (userId, reqUser) => {
    const user = await userModel.findById(userId);
    if (!user) throw new Error("Usuario no encontrado");

    /* solo superadmin puede eliminar usuarios */
    if (reqUser.role !== "superadmin") {
        throw new Error("No tenés permisos para eliminar usuarios");
    }

    // el superadmin no puede eliminarse a sí mismo
    if (reqUser._id.toString() === userId) {
        throw new Error("No podés eliminar tu propio usuario");
    }

    await userModel.findByIdAndDelete(userId);
    return { message: "Usuario eliminado correctamente" };

}








module.exports = { syncUser, getAllUsers, getUsersById, updateUser, deleteUser };



/*Si el usuario ya existe y su rol cambió en la BD, igual devuelve el rol 
viejo porque no lo relee. Está bien por ahora pero hay que tenerlo en cuenta.*/