/**
 * Role-based navigation pages
 */
const router = require('express').Router();
const { getDBPool } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/pages', authenticateToken, (req, res) => {

    const role = req.user.role.toLowerCase();

    // ================= SUPERADMIN =================
    if (role === 'superadmin') {
        const pages = [
            { name: "Dashboard", file: "/admin/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            { name: "priority Management", file: "/admin/priority", icon: "fa fa-exclamation-triangle", badge: 0, category: "Management" },
            { name: "natures", file: "/admin/natures", icon: "fa fa-tags", badge: 0, category: "Management" },

            { name: "Colonies", file: "/admin/colonies", icon: "fa fa-city", badge: 0, category: "Locations" },
            { name: "Buildings", file: "/admin/buildings", icon: "fa fa-building", badge: 0, category: "Locations" },
            { name: "Floors", file: "/admin/floors-management", icon: "fa fa-layer-group", badge: 0, category: "Locations" },

            { name: "All Customers", file: "/admin/all-customers", icon: "fa fa-user-friends", badge: 0, category: "Users" },
            { name: "staff", file: "/admin/staff-management", icon: "fa fa-screwdriver-wrench", badge: 0, category: "Users" },
            { name: "Handlers", file: "/admin/handlers", icon: "fa fa-headset", badge: 0, category: "Users" },
            { name: "Admins", file: "/admin/admins", icon: "fa fa-user-shield", badge: 0, category: "Users" },

            { name: "Daily Report", file: "/admin/daily-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Complaints Report", file: "/admin/complaints-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Found Items Report", file: "/admin/found-items-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Handlers Report", file: "/admin/handlers-reporting", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "staff Report", file: "/admin/staff-reporting", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },

            { name: "Profile", file: "/admin/profile", icon: "fa fa-user-circle", badge: 0, category: "Account" },
        ];

        return res.json({ success: true, pages });
    }

    // ================= admin =================
    if (role === 'admin') {
        const pages = [
            { name: "Dashboard", file: "/admin/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            { name: "priority Management", file: "/admin/priority", icon: "fa fa-exclamation-triangle", badge: 0, category: "Management" },
            { name: "natures", file: "/admin/natures", icon: "fa fa-tags", badge: 0, category: "Management" },

            { name: "Colonies", file: "/admin/colonies", icon: "fa fa-city", badge: 0, category: "Locations" },
            { name: "Buildings", file: "/admin/buildings", icon: "fa fa-building", badge: 0, category: "Locations" },
            { name: "Floors", file: "/admin/floors-management", icon: "fa fa-layer-group", badge: 0, category: "Locations" },

            { name: "All Customers", file: "/admin/all-customers", icon: "fa fa-user-friends", badge: 0, category: "Users" },
            { name: "staff", file: "/admin/staff-management", icon: "fa fa-screwdriver-wrench", badge: 0, category: "Users" },
            { name: "Handlers", file: "/admin/handlers", icon: "fa fa-headset", badge: 0, category: "Users" },

            { name: "Daily Report", file: "/admin/daily-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Complaints Report", file: "/admin/complaints-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Handlers Report", file: "/admin/handlers-reporting", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "staff Report", file: "/admin/staff-reporting", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },

            { name: "Profile", file: "/admin/profile", icon: "fa fa-user-circle", badge: 0, category: "Account" },
        ];

        return res.json({ success: true, pages });
    }

    // ================= customer =================
    if (role === 'customer') {
        const pages = [
            { name: "Dashboard", file: "/customer/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            { name: "Submit Complaint", file: "/customer/submit-complaint", icon: "fa fa-exclamation-circle", badge: 0, category: "Actions" },
            { name: "Submit Found", file: "/customer/submit-found", icon: "fa fa-hand-holding", badge: 0, category: "Actions" },

            { name: "My Complaints", file: "/customer/my-complaints", icon: "fa fa-clipboard-list", badge: 0, category: "My Records" },
            { name: "Found Items", file: "/customer/found-items", icon: "fa fa-box-open", badge: 0, category: "My Records" },
            { name: "My Found Items", file: "/customer/my-found-items", icon: "fa fa-search", badge: 0, category: "My Records" },

            { name: "Profile", file: "/customer/profile", icon: "fa fa-user-circle", badge: 0, category: "Account" },
        ];

        return res.json({ success: true, pages });
    }

    // ================= staff =================
    if (role === 'staff') {
        const pages = [
            { name: "Dashboard", file: "/staff/dashboard", icon: "fa fa-home", badge: 0 },
            { name: "All Complaints", file: "/staff/complaints", icon: "fa fa-clipboard-list", badge: 0 },
            { name: "Profile", file: "/staff/profile", icon: "fa fa-user-circle", badge: 0 },
        ];

        return res.json({ success: true, pages });
    }

    // ================= HANDLER (complaintreceiver) =================
    if (role === 'complaintreceiver') {
        const pages = [
            { name: "Dashboard", file: "/handler/dashboard", icon: "fa fa-tachometer-alt", badge: 0 },

            { name: "All Complaints", file: "/handler/all-complaints", icon: "fa fa-clipboard-list", badge: 0, category: "Work" },
            { name: "Found Items", file: "/handler/found-items", icon: "fa fa-box-open", badge: 0, category: "Work" },

            { name: "Daily Report", file: "/handler/daily-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Complaints Report", file: "/handler/complaints-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },
            { name: "Found Items Report", file: "/handler/found-items-report", icon: "fa-solid fa-file-lines", badge: 0, category: "Reports" },

            { name: "natures", file: "/handler/natures", icon: "fa fa-tags", badge: 0, category: "Reference" },

            { name: "Profile", file: "/handler/profile", icon: "fa fa-user-circle", badge: 0, category: "Account" },
        ];

        return res.json({ success: true, pages });
    }

    console.log("Unknown role: " + role);
    return res.status(403).json({
        success: false,
        message: "Unauthorized role"
    });
});

module.exports = router;
