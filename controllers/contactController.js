const validator = require("validator")
const nodemailer = require("nodemailer")
const sanitizeHtml = require("sanitize-html")
const { ObjectId } = require("mongodb")
const { request } = require("../app")
const petsCollection = require("../db").db().collection("pets")
const contactsCollection = require("../db").db().collection("contacts")


const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {}
}

exports.submitContact = async function (req, res, next) {
    if (req.body.secret.toUpperCase() !== "PUPPY") {
        console.log("Spam")
        return res.json({ message: "Sorry!" })

    }

    if (typeof req.body.name != "string") {
        req.body.name = ""
    }
    if (typeof req.body.email != "string") {
        req.body.email = ""
    } if (typeof req.body.comment != "string") {
        req.body.comment = ""
    }
    if (!validator.isEmail(req.body.email)) {
        console.log("Invalid email!")
        return res.json({ message: "Sorry!" })
    }
    if (!ObjectId.isValid(req.body.petId)) {
        console.log("Invalid ID.")
        return res.json({ message: "Sorry!" })
    }


    req.body.petId = new ObjectId(req.body.petId)
    const doesPetExist = await petsCollection.findOne({ _id: req.body.petId })


    if (!doesPetExist) {
        console.log("Pet does not exist.")
        return res.json({ message: "Sorry!" })
    }
    const ourObject = {
        petId: req.body.petId,
        name: sanitizeHtml(req.body.name, sanitizeOptions),
        email: sanitizeHtml(req.body.email, sanitizeOptions),
        comment: sanitizeHtml(req.body.comment, sanitizeOptions)
    }
    console.log(ourObject)

    var transport = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: process.env.MAILTRAPUSERNAME,
            pass: process.env.MAILTRAPPASSWORD
        }
    })

    try {

        const promise1 = transport.sendMail({
            to: ourObject.email,
            from: "petadoption@localhost.com",
            subject: `Thank you for you interest in ${doesPetExist.name}.`,
            html: `<h3 style="color: purple; font-size: 30px; font-weight: normal:">Thank you!~~</h3>
        <p> We appreciate your interest in ${doesPetExist.name}. One of our stuff members will contact you shortly. Below there is a copy of your message for personal records. </p>
        <p>"<em>${ourObject.comment}</em>"</p>`,
        })
        const promise2 = transport.sendMail({
            to: "petadoption@localhost.com",
            from: "petadoption@localhost.com",
            subject: `Someone is interested in ${doesPetExist.name}.`,
            html: `<h3 style="color: purple; font-size: 30px; font-weight: normal;">New Contact!</h3>
        <p> Name: ${ourObject.name}<br>
        Pet interested in: ${doesPetExist.name}<br>
        Email: ${ourObject.email} <br>
        Message: "${ourObject.comment}"
        
        </p>`
        })

        const promise3 = await contactsCollection.insertOne(ourObject)

        await Promise.all([promise1, promise2, promise3])

    } catch (err) {
        next(err)
    }


    res.send("Thank for sending us data")
}

exports.viewPetContacts = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        console.log("Bad Id")
        return res.redirect("/")

    }

    const pet = await petsCollection.findOne({ _id: new ObjectId(req.params.id) })

    if (!pet) {
        console.log("Pet does not exist.")
        return res.redirect("/")
    }
    const contacts = await contactsCollection.find({ petId: new ObjectId(req.params.id) }).toArray()
    res.render("pet-contacts", { contacts, pet })
}
