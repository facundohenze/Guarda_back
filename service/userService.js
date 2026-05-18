const userModel = require("../models/userModel")
const { createClerkClient } = require("@clerk/backend")

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
}

module.exports = { syncUser };