let user = JSON.parse(localStorage.getItem('user')) || null;

// API calls
async function fetchBooks() { const res = await fetch('/books'); return res.json(); }
async function registerUser(username, password, email) { const res = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, email }) }); return res.json(); }
async function loginUser(username, password) { const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); return res.json(); }
async function addBook(book) { const res = await fetch('/books', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) }); return res.json(); }
async function updateBook(book) { const res = await fetch('/books/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) }); return res.json(); }
async function deleteBook(bookId) { const res = await fetch('/books/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bookId }) }); return res.json(); }
async function addUser(employee) { const res = await fetch('/users/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(employee) }); return res.json(); }
async function fetchUsers() { const res = await fetch('/users'); return res.json(); }

// Cart
async function updateCartDropdown() {
    if (!user) return;
    const res = await fetch(`/cart/${user.id}`);
    const cart = await res.json();
    const cartCountSpan = document.getElementById('cart-count');
    if (cartCountSpan) cartCountSpan.textContent = cart.length;
    const container = document.getElementById('cart-items');
    if (!container) return;
    container.innerHTML = '';
    let total = 0;
    cart.forEach(b => {
        total += b.price;
        const div = document.createElement('div');
        div.style.display = 'flex'; div.style.alignItems = 'center'; div.style.justifyContent = 'space-between'; div.style.marginBottom = '8px';
        div.innerHTML = `<img src="${b.cover_url}" style="width:40px;height:50px;object-fit:cover;border-radius:4px;margin-right:5px;">
        <span style="flex:1;margin-left:5px;">${b.title}</span>
        <span>$${b.price.toFixed(2)}</span>
        <button class="remove-btn" data-id="${b.id}">X</button>`;
        container.appendChild(div);
    });
    const totalDiv = document.getElementById('cart-total');
    if (totalDiv) totalDiv.textContent = `Total: $${cart.reduce((sum, b) => sum + b.price, 0).toFixed(2)}`;
    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = async () => {
            const bookId = btn.getAttribute('data-id');
            await fetch('/cart/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, book_id: bookId }) });
            updateCartDropdown();
            loadBooks();
        };
    });
}

// Load books
async function loadBooks(isAdmin = false) {
    const books = await fetchBooks();
    const container = document.getElementById('book-container');
    if (!container) return;
    container.innerHTML = '';
    books.forEach(b => {
        const card = document.createElement('div'); card.className = 'book-card';
        card.innerHTML = `<img src="${b.cover_url}" alt="${b.title}">
        <h3>${b.title}</h3>
        <p>Autor: ${b.author}</p>
        <p>Fecha: ${b.publication_date}</p>
        <p>Precio: S/.${b.price.toFixed(2)}</p>
        <p>Stock: ${b.stock}</p>
        <div class="tooltip">${b.synopsis}</div>`;

        if (isAdmin) {
            const editBtn = document.createElement('button'); editBtn.textContent = 'Editar';
            editBtn.onclick = () => {
                const newTitle = prompt('Título', b.title) || b.title;
                const newStock = parseInt(prompt('Stock', b.stock)) || b.stock;
                updateBook({ ...b, title: newTitle, stock: newStock }).then(() => loadBooks(true));
            };
            card.appendChild(editBtn);

            const delBtn = document.createElement('button'); delBtn.textContent = 'Eliminar';
            delBtn.onclick = async () => {
                if (confirm(`¿Eliminar el libro "${b.title}"?`)) {
                    await deleteBook(b.id);
                    loadBooks(true);
                }
            };
            card.appendChild(delBtn);

        } else {
            const btn = document.createElement('button'); btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Comprar';
            btn.onclick = async () => {
                if (!user) { alert('Debes registrarte para comprar'); return; }
                if (b.stock <= 0) { alert('No hay stock disponible'); return; }
                await fetch('/cart/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id, book_id: b.id }) });
                updateCartDropdown();
                loadBooks();
                alert('Libro agregado al carrito');
            };
            card.appendChild(btn);
        }
        container.appendChild(card);
    });
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    const nav = document.getElementById('nav-links');
    if (user) {
        nav.innerHTML = `Hola, ${user.username} | <a href="#" id="logout">Salir</a>${user.role === 'admin' ? ' | <a href="admin.html">Admin</a> | <a href="admin_employees.html">Trabajadores</a>' : ' | <a href="#" id="cart-btn"><i class="fas fa-shopping-cart"></i> Carrito <span id="cart-count">0</span></a>'}`;

        document.getElementById('logout').addEventListener('click', () => { localStorage.removeItem('user'); location.reload(); });

        if (user.role !== 'admin') {
            document.getElementById('cart-btn').addEventListener('click', () => {
                const dropdown = document.getElementById('cart-dropdown');
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
            const checkoutBtn = document.getElementById('checkout-btn');
            if (checkoutBtn) {
                checkoutBtn.addEventListener('click', async () => {
                    await fetch('/cart/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.id }) });
                    updateCartDropdown();
                    loadBooks();
                    alert('Pago simulado realizado');
                });
            }
            updateCartDropdown();
        }
        loadBooks(user.role === 'admin');
    } else {
        nav.innerHTML = `<a href="login.html">Login</a> | <a href="register.html">Registro</a>`;
        loadBooks(false);
    }
});
