document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('user'));

    // Admin Route Protection
    if (!userData) {
        alert("You must sign in as an administrator.");
        window.location.href = "login.html";
        return;
    }
    if (userData.rol !== 'admin') {
        alert("Access denied. Admins only.");
        window.location.href = "/index.html"; // Redirect to home 
        return;
    }

    if (typeof ScrollReveal === 'function') {
        const mainAdminSection = document.querySelector('main.section');
        if (mainAdminSection) {
            ScrollReveal().reveal(mainAdminSection, {
                delay: 100, 
                distance: '30px',
                duration: 800,
                easing: 'ease-in-out',
                origin: 'bottom',
                reset: false 
            });
        }
    }

    const nombreAdminElement = document.getElementById('nombre-admin');
    if (nombreAdminElement) {
        nombreAdminElement.textContent = userData.nombre || "Admin";
    }

    // Load footer placeholder
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        const basePath = '/assets/js/recycled/'; 
        fetch(`${basePath}footer.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${response.url}`);
                }
                return response.text();
            })
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    } else {
        console.warn("Footer placeholder 'footer-placeholder' not found on this page.");
    }

    // API Base URL
    const API_BASE_URL = window.API_URL || 'http://localhost:3000/api';

    // Navigation
    const adminNavLinks = document.querySelectorAll('.admin-nav-link');
    const dataContainers = document.querySelectorAll('.admin-data-container');

    // Table Bodies
    const usersTableBody = document.querySelector('#usersTable tbody');
    const statisticsTableBody = document.querySelector('#statisticsTable tbody');
    const contactMessagesTableBody = document.querySelector('#contactMessagesTable tbody');
    const logsTableBody = document.querySelector('#logsTable tbody');

    // Edit User Modal
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const closeModalBtn = editUserModal ? editUserModal.querySelector('.close-modal-btn') : null;
    const editUserIdInput = document.getElementById('editUserId');
    const editUserNameInput = document.getElementById('editUserName');
    const editUserEmailInput = document.getElementById('editUserEmail');
    const editUserRolSelect = document.getElementById('editUserRol');

    // Log Detail Modal
    const logDetailModal = document.getElementById('logDetailModal');
    const closeLogDetailModalBtn = document.getElementById('closeLogDetailModal');
    const logDetailContent = document.getElementById('logDetailContent');


    function hideAllDataContainers() {
        dataContainers.forEach(container => container.style.display = 'none');
    }

    function setActiveNavLink(targetId) {
        adminNavLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.target === targetId);
        });
    }

    adminNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            hideAllDataContainers();
            const targetContainer = document.getElementById(targetId);
            if (targetContainer) {
                targetContainer.style.display = 'block';
                setActiveNavLink(targetId);

                // Load data for the selected section
                if (targetId === 'usersContainer') fetchAndDisplayUsers();
                else if (targetId === 'statisticsContainer') fetchAndDisplayStatistics();
                else if (targetId === 'contactMessagesContainer') fetchAndDisplayContactMessages();
                else if (targetId === 'logsContainer') fetchAndDisplayLogs();
            }
        });
    });

    // --- User Management ---
    async function fetchAndDisplayUsers() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '<tr><td colspan="6">Loading users...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const users = await response.json();
            renderUsersTable(users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            usersTableBody.innerHTML = '<tr><td colspan="6">Failed to load users.</td></tr>';
        }
    }

    function renderUsersTable(users) {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = '';
        if (!users || users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.insertCell().textContent = user.id_usuario;
            row.insertCell().textContent = user.nombre_usuario;
            row.insertCell().textContent = user.correo;
            row.insertCell().textContent = user.rol;
            row.insertCell().textContent = new Date(user.fecha_registro).toLocaleDateString();
            const actionsCell = row.insertCell();
            actionsCell.innerHTML = `
                <button class="btn-action btn-edit" data-id="${user.id_usuario}" data-nombre="${user.nombre_usuario}" data-correo="${user.correo}" data-rol="${user.rol}">Edit</button>
                <button class="btn-action btn-delete" data-id="${user.id_usuario}" data-nombre="${user.nombre_usuario}">Delete</button>`;
        });
    }

    if (usersTableBody) {
        usersTableBody.addEventListener('click', async (event) => {
            const target = event.target.closest('button.btn-action');
            if (!target) return;

            const userId = target.dataset.id;
            const userName = target.dataset.nombre;

            if (target.classList.contains('btn-delete')) {
                if (confirm(`Are you sure you want to delete user "${userName}" (ID: ${userId})?`)) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (response.ok) {
                            alert(result.message || `User ${userName} deleted successfully.`);
                            fetchAndDisplayUsers(); // Refresh table
                        } else {
                            alert(`Error: ${result.message || 'Failed to delete user.'}`);
                        }
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        alert('An error occurred while deleting the user.');
                    }
                }
            } else if (target.classList.contains('btn-edit')) {
                if (editUserModal && editUserIdInput && editUserNameInput && editUserEmailInput && editUserRolSelect) {
                    editUserIdInput.value = userId;
                    editUserNameInput.value = target.dataset.nombre;
                    editUserEmailInput.value = target.dataset.correo;
                    editUserRolSelect.value = target.dataset.rol;
                    editUserModal.style.display = 'block';
                }
            }
        });
    }

    if (editUserForm) {
        editUserForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!editUserIdInput || !editUserNameInput || !editUserEmailInput || !editUserRolSelect) return;

            const userId = editUserIdInput.value;
            const updatedUserData = {
                nombre_usuario: editUserNameInput.value,
                correo: editUserEmailInput.value,
                rol: editUserRolSelect.value,
            };

            try {
                const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedUserData),
                });
                const result = await response.json();
                if (response.ok) {
                    alert(result.message || 'User updated successfully!');
                    if (editUserModal) editUserModal.style.display = 'none';
                    fetchAndDisplayUsers(); // Refresh table
                } else {
                    alert(`Error: ${result.message || 'Failed to update user.'}`);
                }
            } catch (error) {
                console.error('Error updating user:', error);
                alert('An error occurred while updating the user.');
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (editUserModal) editUserModal.style.display = 'none';
        });
    }
    window.addEventListener('click', (event) => {
        if (event.target === editUserModal) {
            if (editUserModal) editUserModal.style.display = 'none';
        }
    });

    // --- Statistics ---
    async function fetchAndDisplayStatistics() {
        if (!statisticsTableBody) return;
        statisticsTableBody.innerHTML = '<tr><td colspan="6">Loading statistics...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/statistics`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const stats = await response.json();
            renderStatisticsTable(stats);
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            statisticsTableBody.innerHTML = '<tr><td colspan="6">Failed to load statistics.</td></tr>';
        }
    }

    function renderStatisticsTable(stats) {
        if (!statisticsTableBody) return;
        statisticsTableBody.innerHTML = '';
        if (!stats || stats.length === 0) {
            statisticsTableBody.innerHTML = '<tr><td colspan="6">No statistics found.</td></tr>';
            return;
        }
        stats.forEach(stat => {
            const row = statisticsTableBody.insertRow();
            row.insertCell().textContent = stat.id_usuario;
            row.insertCell().textContent = stat.nombre_usuario;
            row.insertCell().textContent = stat.misiones_completadas;
            row.insertCell().textContent = stat.objetos_obtenidos;
            row.insertCell().textContent = stat.enemigos_neutralizados;
            row.insertCell().textContent = stat.tiempo_total_juego;
        });
    }

    // --- Contact Messages ---
    async function fetchAndDisplayContactMessages() {
        if (!contactMessagesTableBody) return;
        contactMessagesTableBody.innerHTML = '<tr><td colspan="7">Loading messages...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/contact-messages`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const messages = await response.json();
            renderContactMessagesTable(messages);
        } catch (error) {
            console.error('Failed to fetch contact messages:', error);
            contactMessagesTableBody.innerHTML = '<tr><td colspan="7">Failed to load messages.</td></tr>';
        }
    }

    function renderContactMessagesTable(messages) {
        if (!contactMessagesTableBody) return;
        contactMessagesTableBody.innerHTML = '';
        if (!messages || messages.length === 0) {
            contactMessagesTableBody.innerHTML = '<tr><td colspan="7">No contact messages found.</td></tr>';
            return;
        }
        messages.forEach(msg => {
            const row = contactMessagesTableBody.insertRow();
            row.insertCell().textContent = msg.id_contact_message;
            row.insertCell().textContent = msg.name;
            row.insertCell().textContent = msg.email;
            const messageCell = row.insertCell();
            messageCell.textContent = msg.message.length > 50 ? msg.message.substring(0, 50) + '...' : msg.message;
            messageCell.title = msg.message;
            row.insertCell().textContent = new Date(msg.submission_date).toLocaleString();
            
            // Display current status as text
            const statusCell = row.insertCell();
            statusCell.textContent = msg.status.charAt(0).toUpperCase() + msg.status.slice(1);

            // Actions column
            const actionsCell = row.insertCell();
            actionsCell.classList.add('contact-message-actions'); 

            if (msg.status !== 'new') {
                const setNewButton = document.createElement('button');
                setNewButton.classList.add('btn-action', 'btn-status-new');
                setNewButton.textContent = 'Set New';
                setNewButton.dataset.id = msg.id_contact_message;
                setNewButton.dataset.newStatus = 'new';
                actionsCell.appendChild(setNewButton);
            }
            if (msg.status !== 'read') {
                const setReadButton = document.createElement('button');
                setReadButton.classList.add('btn-action', 'btn-status-read');
                setReadButton.textContent = 'Set Read';
                setReadButton.dataset.id = msg.id_contact_message;
                setReadButton.dataset.newStatus = 'read';
                actionsCell.appendChild(setReadButton);
            }
            if (msg.status !== 'archived') {
                const setArchivedButton = document.createElement('button');
                setArchivedButton.classList.add('btn-action', 'btn-status-archive');
                setArchivedButton.textContent = 'Archive';
                setArchivedButton.dataset.id = msg.id_contact_message;
                setArchivedButton.dataset.newStatus = 'archived';
                actionsCell.appendChild(setArchivedButton);
            }
        });
    }
    
    if (contactMessagesTableBody) {
        contactMessagesTableBody.addEventListener('click', async (event) => {
            const target = event.target.closest('button.btn-action[data-new-status]');
            if (!target) return;
    
            const messageId = target.dataset.id;
            const newStatus = target.dataset.newStatus;
    
            if (messageId && newStatus) {
                if (confirm(`Change status to "${newStatus}" for message ID ${messageId}?`)) {
                await updateMessageStatus(messageId, newStatus);
                }
            }
        });
    }

    async function updateMessageStatus(messageId, newStatus) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/contact-messages/${messageId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Status updated successfully!');
                fetchAndDisplayContactMessages(); // Refresh the table to show the new status
            } else {
                alert(`Error: ${result.message || 'Failed to update message status.'}`);
                fetchAndDisplayContactMessages(); 
            }
        } catch (error) {
            console.error('Error updating message status:', error);
            alert('An error occurred while updating message status.');
            fetchAndDisplayContactMessages();
        }
    }
    // --- System Logs (Bitacora) ---
    async function fetchAndDisplayLogs() {
        if (!logsTableBody) return;
        logsTableBody.innerHTML = '<tr><td colspan="11">Loading system logs...</td></tr>';
        try {
            const response = await fetch(`${API_BASE_URL}/admin/logs?limit=50&offset=0`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const logs = await response.json();
            renderLogsTable(logs);
        } catch (error) {
            console.error('Failed to fetch system logs:', error);
            logsTableBody.innerHTML = `<tr><td colspan="11">Failed to load system logs: ${error.message}</td></tr>`;
        }
    }

    function renderLogsTable(logs) {
        if (!logsTableBody) return;
        logsTableBody.innerHTML = '';
        if (!logs || logs.length === 0) {
            logsTableBody.innerHTML = '<tr><td colspan="11">No system logs found.</td></tr>';
            return;
        }
        logs.forEach(log => {
            const row = logsTableBody.insertRow();
            row.insertCell().textContent = log.id_log;
            row.insertCell().textContent = log.nombre_tabla_afectada;
            row.insertCell().textContent = log.id_registro_afectado || 'N/A';
            row.insertCell().textContent = log.nombre_usuario_modificador || 'N/A';
            row.insertCell().textContent = log.pantalla_origen || 'N/A';
            
            const descCell = row.insertCell();
            const fullDesc = log.descripcion_accion || 'N/A';
            descCell.textContent = fullDesc.length > 70 ? fullDesc.substring(0, 70) + '...' : fullDesc;
            // Make cell clickable and store full description
            descCell.classList.add('log-action-desc-clickable');
            descCell.dataset.fullDescription = fullDesc;
            descCell.title = "Click to see full description"; // Tooltip

            row.insertCell().textContent = log.tipo_operacion;
            row.insertCell().textContent = new Date(log.fecha_operacion).toLocaleString();
            row.insertCell().textContent = log.estatus_operacion || 'N/A';

            const oldDataCell = row.insertCell();
            const oldDataDiv = document.createElement('div');
            oldDataDiv.classList.add('json-data-log');
            try {
                oldDataDiv.textContent = log.datos_viejos ? JSON.stringify(JSON.parse(log.datos_viejos), null, 2) : 'N/A';
            } catch { oldDataDiv.textContent = log.datos_viejos || 'N/A'; } 
            oldDataCell.appendChild(oldDataDiv);
            
            const newDataCell = row.insertCell();
            const newDataDiv = document.createElement('div');
            newDataDiv.classList.add('json-data-log');
            try {
                newDataDiv.textContent = log.datos_nuevos ? JSON.stringify(JSON.parse(log.datos_nuevos), null, 2) : 'N/A';
            } catch { newDataDiv.textContent = log.datos_nuevos || 'N/A'; } 
            newDataCell.appendChild(newDataDiv);
        });
    }

    // Event listener for clickable log descriptions
    if (logsTableBody) {
        logsTableBody.addEventListener('click', (event) => {
            const targetCell = event.target.closest('td.log-action-desc-clickable');
            if (targetCell && logDetailModal && logDetailContent) {
                logDetailContent.textContent = targetCell.dataset.fullDescription || "No description available.";
                logDetailModal.style.display = 'block';
            }
        });
    }

    // Close Log Detail Modal
    if (closeLogDetailModalBtn && logDetailModal) {
        closeLogDetailModalBtn.onclick = () => {
            logDetailModal.style.display = 'none';
        };
    }

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === editUserModal && editUserModal) {
            editUserModal.style.display = 'none';
        }
        if (event.target === logDetailModal && logDetailModal) {
            logDetailModal.style.display = 'none';
        }
    });
    
    // Initial Load
    if (adminNavLinks.length > 0) {
        adminNavLinks[0].click(); 
    }
});