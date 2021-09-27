import Server from "./Server.js"

export const db = new Server({
    peers: ["https://mimiza.herokuapp.com/gun"]
})

export default { Server, db }
