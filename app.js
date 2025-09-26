const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./biblioTech.db', (err)=>{
    if(err) console.error(err.message);
    else console.log('Conectado a SQLite3');
});

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));

// Crear tablas si no existen
db.serialize(()=>{
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        photo TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        author TEXT,
        publication_date TEXT,
        price REAL,
        stock INTEGER,
        category TEXT,
        cover_url TEXT,
        synopsis TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        book_id INTEGER,
        quantity INTEGER DEFAULT 1
    )`);
    

    // Crear admin por defecto si no existe
    db.get(`SELECT * FROM users WHERE role='admin'`, (err,row)=>{
        if(!row){
            const hashed = bcrypt.hashSync('admin123',10);
            db.run(`INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)`,
            ['admin','admin@biblio.com',hashed,'admin']);
            console.log('Admin por defecto creado: admin/admin123');
        }
    });
});

// Registro
app.post('/register',(req,res)=>{
    const {username,email,password} = req.body;
    const hashed = bcrypt.hashSync(password,10);
    db.run(`INSERT INTO users (username,email,password,role) VALUES (?,?,?,?)`,
    [username,email,hashed,'user'], function(err){
        if(err) res.json({success:false,error:'Usuario o correo ya registrado'});
        else res.json({success:true,user:{id:this.lastID,username,email,role:'user'}});
    });
});

// Login
app.post('/login',(req,res)=>{
    const {username,password}=req.body;
    db.get(`SELECT * FROM users WHERE username=?`,[username],(err,row)=>{
        if(!row) return res.json({success:false,error:'Usuario no encontrado'});
        if(bcrypt.compareSync(password,row.password)){
            res.json({success:true,user:{id:row.id,username:row.username,email:row.email,role:row.role}});
        } else res.json({success:false,error:'Contraseña incorrecta'});
    });
});

// Listar libros
app.get('/books',(req,res)=>{
    db.all(`SELECT * FROM books`,[],(err,rows)=>{
        if(err) res.json([]);
        else res.json(rows);
    });
});

// Agregar libro (admin)
app.post('/books',(req,res)=>{
    const {title,author,publication_date,price,stock,category,cover_url,synopsis}=req.body;
    db.run(`INSERT INTO books (title,author,publication_date,price,stock,category,cover_url,synopsis) VALUES (?,?,?,?,?,?,?,?)`,
    [title,author,publication_date,price,stock,category,cover_url,synopsis],function(err){
        if(err) res.json({success:false});
        else res.json({success:true,id:this.lastID});
    });
});

// Editar libro (admin)
app.post('/books/update',(req,res)=>{
    const {id,title,stock} = req.body;
    db.run(`UPDATE books SET title=?, stock=? WHERE id=?`,[title,stock,id],function(err){
        if(err) res.json({success:false});
        else res.json({success:true});
    });
});

// Agregar empleado/admin (admin)
app.post('/users/add',(req,res)=>{
    const {username,email,password,role,photo}=req.body;
    const hashed = bcrypt.hashSync(password,10);
    db.run(`INSERT INTO users (username,email,password,role,photo) VALUES (?,?,?,?,?)`,
    [username,email,hashed,role,photo],function(err){
        if(err) res.json({success:false,error:'Usuario ya existe'});
        else res.json({success:true,id:this.lastID});
    });
});

// Listar usuarios
app.get('/users',(req,res)=>{
    db.all(`SELECT id,username,email,role,photo FROM users`,[],(err,rows)=>{
        if(err) res.json([]);
        else res.json(rows);
    });
});

// Carrito
app.get('/cart/:user_id',(req,res)=>{
    const uid = req.params.user_id;
    db.all(`SELECT b.id,b.title,b.author,b.price,b.cover_url,b.stock FROM cart c JOIN books b ON c.book_id=b.id WHERE c.user_id=?`,[uid],(err,rows)=>{
        if(err) res.json([]);
        else res.json(rows);
    });
});

app.post('/cart/add',(req,res)=>{
    const {user_id,book_id} = req.body;
    db.get(`SELECT * FROM cart WHERE user_id=? AND book_id=?`,[user_id,book_id],(err,row)=>{
        if(row){
            db.run(`UPDATE cart SET quantity=quantity+1 WHERE id=?`,[row.id]);
        } else {
            db.run(`INSERT INTO cart (user_id,book_id,quantity) VALUES (?,?,1)`,[user_id,book_id]);
        }
        res.json({success:true});
    });
});



app.post('/cart/remove',(req,res)=>{
    const {user_id,book_id} = req.body;
    db.run(`DELETE FROM cart WHERE user_id=? AND book_id=?`,[user_id,book_id],(err)=>{
        res.json({success:true});
    });
});


// Eliminar libro (admin)
app.post('/books/delete',(req,res)=>{
    const {id} = req.body;
    db.run(`DELETE FROM books WHERE id=?`,[id],(err)=>{
        if(err) res.json({success:false});
        else res.json({success:true});
    });
});



app.post('/cart/checkout',(req,res)=>{
    const {user_id} = req.body;
    db.all(`SELECT * FROM cart WHERE user_id=?`,[user_id],(err,rows)=>{
        if(err) return res.json({success:false});
        rows.forEach(r=>{
            db.run(`UPDATE books SET stock=stock-1 WHERE id=? AND stock>0`,[r.book_id]);
        });
        db.run(`DELETE FROM cart WHERE user_id=?`,[user_id]);
        res.json({success:true});
    });
});

// Servidor
const PORT = 3000;
app.listen(PORT,()=>console.log(`Servidor corriendo en http://localhost:${PORT}`));
