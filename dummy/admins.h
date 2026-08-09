<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <title>Admin Management</title>
    <link rel="icon" type="image/png" href="/assets/logo_nobg.png">
    <link rel="stylesheet" href="/public/styles/common-styles.css">
    <style>
        /* Admin Management Styles */
        .admin-management {
            padding: 24px;
            background-color: var(--main-bg);
            min-height: calc(100vh - var(--header-height));
        }

        /* Header Section */
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 28px;
            flex-wrap: wrap;
            gap: 18px;
        }

        .admin-header h2 {
            color: var(--primary-color);
            font-size: 26px;
            margin: 0;
            font-weight: 700;
            letter-spacing: -0.5px;
            position: relative;
            padding-bottom: 8px;
        }

        .admin-header h2:after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 50px;
            height: 3px;
            background: var(--primary-color);
            border-radius: 2px;
        }

        /* Button Group */
        .btn-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        /* Base Button Styles */
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.25s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            white-space: nowrap;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.03);
            letter-spacing: 0.3px;
        }

        .btn i {
            font-size: 16px;
        }

        .btn-primary {
            background: linear-gradient(145deg, var(--primary-color), #0a4f42);
            color: white;
        }

        .btn-primary:hover {
            background: linear-gradient(145deg, #0a4f42, var(--primary-color));
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(14, 90, 76, 0.25);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-secondary {
            background: white;
            color: var(--text-gray);
            border: 2px solid #e8ecf0;
        }

        .btn-secondary:hover {
            background: #f8fafc;
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.05);
        }

        .btn-search {
            background: linear-gradient(145deg, var(--primary-color), #0a4f42);
            color: white;
            padding: 0 32px;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            height: 52px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            transition: all 0.25s ease;
            box-shadow: 0 4px 10px rgba(14, 90, 76, 0.15);
            letter-spacing: 0.5px;
        }

        .btn-search:hover {
            background: linear-gradient(145deg, #0a4f42, #08543c);
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(14, 90, 76, 0.25);
        }

        .btn-search i {
            font-size: 18px;
        }

        /* Search Section */
        .search-container {
            display: flex;
            gap: 16px;
            margin-bottom: 28px;
            align-items: center;
            flex-wrap: wrap;
        }

        .search-box {
            position: relative;
            flex: 1;
            min-width: 350px;
        }

        .search-box input {
            width: 100%;
            padding: 14px 20px 14px 48px;
            border: 2px solid #e8ecf0;
            border-radius: 14px;
            font-size: 16px;
            height: 52px;
            transition: all 0.25s ease;
            background-color: white;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.02);
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 4px rgba(14, 90, 76, 0.12);
        }

        .search-box input::placeholder {
            color: #a0aec0;
            font-weight: 400;
        }

        .search-box i {
            position: absolute;
            left: 18px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 20px;
        }

        /* Superadmin Notice */
        .superadmin-notice {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1));
            color: #8B6910;
            padding: 14px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 5px solid #FFD700;
            border-right: 1px solid #FFE55C;
            border-top: 1px solid #FFE55C;
            border-bottom: 1px solid #FFE55C;
            box-shadow: 0 4px 12px rgba(255, 215, 0, 0.15);
        }

        .superadmin-notice i {
            font-size: 20px;
            color: #FFD700;
            filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4));
        }

        /* Table Controls */
        .table-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 18px;
            background: white;
            padding: 16px 24px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
            border: 1px solid #edf2f7;
        }

        .entries-selector {
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text-gray);
            font-size: 15px;
            font-weight: 500;
        }

        .entries-selector select {
            padding: 10px 36px 10px 14px;
            border: 2px solid #e8ecf0;
            border-radius: 10px;
            background-color: white;
            font-size: 15px;
            font-weight: 500;
            color: #1a2b3c;
            cursor: pointer;
            transition: all 0.2s ease;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            background-size: 16px;
        }

        .entries-selector select:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(14, 90, 76, 0.12);
        }

        /* Table Container */
        .table-container {
            background: white;
            border-radius: 20px;
            border: 1px solid #edf2f7;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.04);
            overflow: hidden;
            margin-bottom: 28px;
        }

        /* Table Styles */
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        /* Table Header */
        thead {
            background: linear-gradient(180deg, #f8fafd 0%, #f1f5f9 100%);
            border-bottom: 3px solid var(--primary-color);
        }

        th {
            padding: 20px 16px;
            text-align: left;
            color: var(--primary-color);
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-right: 1px solid #e2e8f0;
            white-space: nowrap;
            position: relative;
        }

        th:last-child {
            border-right: none;
        }

        /* Table Body */
        tbody tr {
            border-bottom: 1px solid #edf2f7;
            transition: all 0.25s ease;
        }

        tbody tr:last-child {
            border-bottom: none;
        }

        tbody tr:hover {
            background-color: rgba(14, 90, 76, 0.04);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        /* Special styling for superadmin rows */
        tbody tr.superadmin-row {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(255, 165, 0, 0.05));
            border-left: 6px solid #FFD700;
            position: relative;
        }

        tbody tr.superadmin-row:hover {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1));
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(255, 215, 0, 0.15);
        }

        tbody tr.superadmin-row td {
            color: #2d3a4b;
        }

        td {
            padding: 18px 16px;
            color: #2d3a4b;
            font-size: 15px;
            border-right: 1px solid #edf2f7;
            vertical-align: middle;
            line-height: 1.5;
        }

        td:last-child {
            border-right: none;
        }

        /* Optimized Column Widths - Desktop */
        th:nth-child(1),
        td:nth-child(1) {
            width: 5%;
            text-align: center;
            font-weight: 700;
            color: var(--primary-color);
        }

        th:nth-child(2),
        td:nth-child(2) {
            width: 8%;
            text-align: left;
            font-family: 'Courier New', monospace;
            font-weight: 600;
            color: #1e2b3a;
        }

        th:nth-child(3),
        td:nth-child(3) {
            width: 8%;
            text-align: center;
        }

        th:nth-child(4),
        td:nth-child(4) {
            width: 14%;
            font-weight: 600;
            color: #1a2b3c;
        }

        th:nth-child(5),
        td:nth-child(5) {
            width: 16%;
            color: #4a5b6b;
        }

        th:nth-child(6),
        td:nth-child(6) {
            width: 12%;
            text-align: center;
        }

        th:nth-child(7),
        td:nth-child(7) {
            width: 10%;
            text-align: center;
        }

        th:nth-child(8),
        td:nth-child(8) {
            width: 12%;
            color: #4a5b6b;
        }

        th:nth-child(9),
        td:nth-child(9) {
            width: 15%;
            text-align: left;
        }

        /* Admin Image Styles */
        .admin-img {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
            transition: all 0.3s ease;
            display: block;
            margin: 0 auto;
        }

        .admin-img:hover {
            transform: scale(1.15);
            box-shadow: 0 8px 20px rgba(14, 90, 76, 0.3);
            border-color: var(--primary-color);
        }

        .img-placeholder {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(145deg, var(--primary-color), #0a4f42);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
            font-size: 22px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
        }

        .img-placeholder:hover {
            transform: scale(1.1);
            box-shadow: 0 8px 18px rgba(14, 90, 76, 0.25);
        }

        /* Superadmin Badge */
        .superadmin-badge {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            color: #333;
            padding: 4px 10px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            display: inline-block;
            margin-left: 6px;
            border: 1px solid #FFC107;
            box-shadow: 0 2px 6px rgba(255, 215, 0, 0.3);
            letter-spacing: 0.5px;
        }

        /* Role display */
        td:nth-child(6) span {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
        }

        /* Status Badge Styles */
        .status {
            padding: 8px 14px;
            border-radius: 30px;
            font-size: 13px;
            font-weight: 600;
            display: inline-block;
            text-align: center;
            min-width: 85px;
            letter-spacing: 0.4px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
        }

        .status:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
        }

        .status.active {
            background: linear-gradient(145deg, #e6f7e6, #d4edda);
            color: #1e7e34;
            border: 1px solid #b8e0b8;
        }

        .status.inactive {
            background: linear-gradient(145deg, #fee9e9, #f8d7da);
            color: #bd2130;
            border: 1px solid #f5c6cb;
        }

        /* Action Buttons Container */
        td:last-child {
            padding: 16px;
            text-align: center;
        }

        /* Action Button Styles */
        .action-btn {
            background: white;
            border: 2px solid #e8ecf0;
            color: var(--primary-color);
            cursor: pointer;
            padding: 10px 18px;
            border-radius: 12px;
            transition: all 0.25s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            min-width: 100px;
            white-space: nowrap;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
        }

        .action-btn i {
            font-size: 15px;
            transition: all 0.2s ease;
        }

        .action-btn:hover:not(:disabled) {
            background: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(14, 90, 76, 0.25);
        }

        .action-btn:hover:not(:disabled) i {
            color: white;
            transform: scale(1.1);
        }

        .action-btn:active:not(:disabled) {
            transform: translateY(0);
        }

        .action-btn:disabled {
            background: #f5f5f5;
            border-color: #e0e0e0;
            color: #999;
            cursor: not-allowed;
            opacity: 0.7;
            box-shadow: none;
        }

        .action-btn:disabled i {
            color: #999;
        }

        /* Pagination Styles */
        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px 0 12px;
            flex-wrap: wrap;
            gap: 18px;
        }

        .pagination-info {
            color: var(--text-gray);
            font-size: 15px;
            background: #f8fafd;
            padding: 10px 24px;
            border-radius: 40px;
            border: 1px solid #edf2f7;
            font-weight: 500;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .pagination-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .page-btn {
            min-width: 46px;
            height: 46px;
            padding: 0 14px;
            border: 2px solid #e8ecf0;
            background: white;
            border-radius: 12px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            color: var(--text-gray);
            transition: all 0.25s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
        }

        .page-btn i {
            font-size: 15px;
        }

        .page-btn:hover:not(.disabled):not(.active) {
            background-color: #f1f5f9;
            border-color: var(--primary-color);
            color: var(--primary-color);
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(14, 90, 76, 0.12);
        }

        .page-btn.active {
            background: var(--primary-color);
            border-color: var(--primary-color);
            color: white;
            cursor: default;
            box-shadow: 0 6px 16px rgba(14, 90, 76, 0.3);
        }

        .page-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: #f8fafd;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            z-index: 1100;
            overflow-y: auto;
            backdrop-filter: blur(6px);
        }

        .modal-content {
            background-color: white;
            margin: 60px auto;
            padding: 0;
            border-radius: 28px;
            width: 90%;
            max-width: 650px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
            animation: modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-60px) scale(0.95);
            }

            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .modal-header {
            padding: 22px 28px;
            background: linear-gradient(145deg, var(--primary-color), #0a4f42);
            color: white;
            border-radius: 28px 28px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.3px;
        }

        .close-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 32px;
            cursor: pointer;
            padding: 0;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            transition: all 0.25s;
            line-height: 1;
        }

        .close-btn:hover {
            background: rgba(255, 255, 255, 0.35);
            transform: rotate(90deg) scale(1.1);
        }

        .modal-body {
            padding: 28px;
            max-height: 70vh;
            overflow-y: auto;
        }

        /* Form Styles */
        .form-group {
            margin-bottom: 24px;
        }

        .form-group label {
            display: block;
            margin-bottom: 10px;
            color: var(--text-gray);
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }

        .form-control {
            width: 100%;
            padding: 14px 18px;
            border: 2px solid #e8ecf0;
            border-radius: 16px;
            font-size: 16px;
            transition: all 0.2s;
            background-color: #fafcfd;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary-color);
            background-color: white;
            box-shadow: 0 0 0 5px rgba(14, 90, 76, 0.1);
        }

        .form-control:read-only {
            background-color: #f5f5f5;
            cursor: not-allowed;
            opacity: 0.8;
        }

        .form-control::placeholder {
            color: #b0c0d0;
        }

        .form-row {
            display: flex;
            gap: 24px;
            margin-bottom: 24px;
        }

        .form-row .form-group {
            flex: 1;
            margin-bottom: 0;
        }

        /* Image Upload Styles */
        .image-upload-container {
            display: flex;
            align-items: center;
            gap: 28px;
            margin-bottom: 28px;
            padding: 24px;
            background: #f8fafd;
            border-radius: 20px;
            border: 2px dashed #d0d9e0;
        }

        .image-preview {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 5px solid white;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(145deg, #e9ecef, #dee2e6);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        }

        .image-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .image-preview i {
            color: #868e96;
            font-size: 40px;
        }

        .upload-btn {
            padding: 14px 28px;
            background: linear-gradient(145deg, var(--primary-color), #0a4f42);
            color: white;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            transition: all 0.25s;
            box-shadow: 0 6px 14px rgba(14, 90, 76, 0.2);
        }

        .upload-btn:hover {
            background: linear-gradient(145deg, #0a4f42, #08543c);
            transform: translateY(-3px);
            box-shadow: 0 12px 24px rgba(14, 90, 76, 0.3);
        }

        .upload-btn i {
            font-size: 18px;
        }

        .file-input {
            display: none;
        }

        /* Superadmin Field */
        #superadminField {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), rgba(255, 165, 0, 0.05));
            padding: 16px;
            border-radius: 16px;
            border: 1px solid #FFD700;
            margin-bottom: 24px;
        }

        #superadminField label {
            color: #8B6910;
            font-weight: 700;
        }

        #superadminField input {
            border-color: #FFD700;
            background-color: rgba(255, 215, 0, 0.05);
            font-weight: 600;
            color: #8B6910;
        }

        /* Modal Footer */
        .modal-footer {
            padding: 24px 28px;
            border-top: 2px solid #e8ecf0;
            display: flex;
            justify-content: flex-end;
            gap: 16px;
            background: #fafcfd;
            border-radius: 0 0 28px 28px;
        }

        .modal-footer .btn {
            min-width: 120px;
            justify-content: center;
        }

        /* Error States */
        .error-message {
            color: #dc3545;
            font-size: 13px;
            margin-top: 8px;
            display: none;
            font-weight: 500;
            padding-left: 6px;
        }

        .has-error .form-control {
            border-color: #dc3545;
            background-color: #fff8f8;
        }

        .has-error .form-control:focus {
            box-shadow: 0 0 0 5px rgba(220, 53, 69, 0.1);
        }

        /* Empty State */
        td[colspan] {
            text-align: center;
            padding: 60px 20px !important;
            color: #94a3b8;
            font-size: 16px;
        }

        td[colspan] i {
            font-size: 60px;
            color: #d0d9e0;
            margin-bottom: 20px;
            display: block;
        }

        /* Notification Styles (already included from previous, but ensuring consistency) */
        .custom-notification {
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 16px 24px;
            border-radius: 16px;
            color: white;
            font-size: 15px;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 350px;
            max-width: 450px;
            box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
            animation: slideIn 0.3s ease-out;
            backdrop-filter: blur(8px);
        }

        .custom-notification.success {
            background: linear-gradient(145deg, #28a745, #218838);
            border-left: 5px solid #1e7e34;
        }

        .custom-notification.error {
            background: linear-gradient(145deg, #dc3545, #c82333);
            border-left: 5px solid #bd2130;
        }

        .custom-notification.warning {
            background: linear-gradient(145deg, #ffc107, #e0a800);
            border-left: 5px solid #d39e00;
            color: #1e2b3a;
        }

        .notification-close {
            background: none;
            border: none;
            color: currentColor;
            font-size: 22px;
            cursor: pointer;
            padding: 0 0 0 16px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }

        .notification-close:hover {
            opacity: 1;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }

            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        /* ============================================
   RESPONSIVE DESIGN
   ============================================ */

        /* Large Desktop (1200px and above) */
        @media (min-width: 1200px) {

            th:nth-child(9),
            td:nth-child(9) {
                width: 18%;
            }

            .action-btn {
                min-width: 110px;
                padding: 12px 20px;
            }
        }

        /* Desktop (992px - 1199px) */
        @media (max-width: 1199px) {

            th:nth-child(4),
            td:nth-child(4) {
                width: 13%;
            }

            th:nth-child(5),
            td:nth-child(5) {
                width: 14%;
            }

            th:nth-child(6),
            td:nth-child(6) {
                width: 11%;
            }

            th:nth-child(9),
            td:nth-child(9) {
                width: 16%;
            }

            .action-btn {
                padding: 10px 14px;
                min-width: 95px;
                font-size: 13px;
            }
        }

        /* Tablet (768px - 991px) */
        @media (max-width: 991px) {
            .admin-header h2 {
                font-size: 22px;
            }

            .table-container {
                overflow-x: auto;
                border-radius: 16px;
            }

            table {
                min-width: 1100px;
            }

            td:last-child {
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
                padding: 14px;
            }

            .action-btn {
                width: 100%;
                justify-content: center;
                padding: 12px;
            }

            .modal-content {
                margin: 40px auto;
                width: 95%;
                max-width: 600px;
            }

            .form-row {
                flex-direction: column;
                gap: 20px;
            }

            .form-row .form-group {
                margin-bottom: 0;
            }
        }

        /* Mobile Landscape (576px - 767px) */
        @media (max-width: 767px) {
            .admin-management {
                padding: 18px;
            }

            .admin-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

            .admin-header h2 {
                font-size: 20px;
            }

            .btn-group {
                width: 100%;
                overflow-x: auto;
                padding-bottom: 8px;
                margin-bottom: 4px;
                flex-wrap: nowrap;
                -webkit-overflow-scrolling: touch;
            }

            .btn-group::-webkit-scrollbar {
                height: 4px;
            }

            .btn-group::-webkit-scrollbar-thumb {
                background: var(--primary-color);
                border-radius: 10px;
            }

            .btn {
                padding: 10px 18px;
                font-size: 14px;
                flex-shrink: 0;
            }

            .search-container {
                flex-direction: column;
                gap: 14px;
            }

            .search-box {
                min-width: 100%;
            }

            .search-box input {
                height: 48px;
                font-size: 15px;
                padding: 12px 16px 12px 44px;
            }

            .btn-search {
                width: 100%;
                justify-content: center;
                height: 48px;
                padding: 0 20px;
            }

            .table-controls {
                padding: 14px 18px;
                flex-direction: column;
                align-items: flex-start;
            }

            .entries-selector {
                width: 100%;
            }

            .entries-selector select {
                flex: 1;
            }

            .table-container {
                margin: 0 -18px;
                width: calc(100% + 36px);
                border-radius: 0;
                border-left: none;
                border-right: none;
            }

            th,
            td {
                padding: 14px 12px !important;
                font-size: 14px !important;
            }

            th {
                font-size: 13px !important;
                padding: 16px 12px !important;
            }

            /* Mobile column widths */
            th:nth-child(1),
            td:nth-child(1) {
                width: 6%;
            }

            th:nth-child(2),
            td:nth-child(2) {
                width: 9%;
            }

            th:nth-child(3),
            td:nth-child(3) {
                width: 9%;
            }

            th:nth-child(4),
            td:nth-child(4) {
                width: 14%;
            }

            th:nth-child(5),
            td:nth-child(5) {
                width: 16%;
            }

            th:nth-child(6),
            td:nth-child(6) {
                width: 12%;
            }

            th:nth-child(7),
            td:nth-child(7) {
                width: 11%;
            }

            th:nth-child(8),
            td:nth-child(8) {
                width: 13%;
            }

            th:nth-child(9),
            td:nth-child(9) {
                width: 10%;
            }

            .admin-img,
            .img-placeholder {
                width: 44px;
                height: 44px;
                font-size: 18px;
            }

            .status {
                padding: 6px 10px;
                font-size: 12px;
                min-width: 75px;
            }

            .superadmin-badge {
                font-size: 9px;
                padding: 2px 6px;
            }

            .pagination {
                flex-direction: column;
                gap: 15px;
                align-items: stretch;
                padding: 18px 0;
            }

            .pagination-info {
                text-align: center;
                padding: 10px 18px;
                font-size: 14px;
            }

            .pagination-controls {
                justify-content: center;
                width: 100%;
            }

            .page-btn {
                min-width: 42px;
                height: 42px;
                font-size: 14px;
            }

            /* Modal adjustments */
            .modal-content {
                margin: 30px auto;
                width: 95%;
                max-height: 90vh;
            }

            .modal-header {
                padding: 18px 22px;
            }

            .modal-header h3 {
                font-size: 20px;
            }

            .modal-body {
                padding: 22px;
                max-height: 65vh;
            }

            .image-upload-container {
                flex-direction: column;
                align-items: center;
                text-align: center;
                padding: 18px;
                gap: 18px;
            }

            .image-preview {
                width: 90px;
                height: 90px;
            }

            .upload-btn {
                width: 100%;
                justify-content: center;
            }

            .modal-footer {
                padding: 18px 22px;
                flex-direction: column-reverse;
            }

            .modal-footer .btn {
                width: 100%;
                justify-content: center;
            }
        }

        /* Mobile Portrait (below 576px) */
        @media (max-width: 575px) {
            .admin-management {
                padding: 14px;
            }

            .admin-header h2 {
                font-size: 18px;
            }

            .btn {
                padding: 8px 14px;
                font-size: 13px;
            }

            .btn i {
                font-size: 13px;
            }

            .search-box input {
                font-size: 14px;
                padding: 10px 14px 10px 40px;
                height: 44px;
            }

            .search-box i {
                left: 14px;
                font-size: 18px;
            }

            .btn-search {
                height: 44px;
                font-size: 14px;
            }

            .table-controls {
                padding: 12px 14px;
            }

            .entries-selector {
                font-size: 13px;
            }

            .entries-selector select {
                padding: 8px 32px 8px 12px;
                font-size: 13px;
            }

            table {
                min-width: 1000px;
            }

            th,
            td {
                padding: 12px 10px !important;
                font-size: 13px !important;
            }

            th {
                font-size: 12px !important;
                padding: 14px 10px !important;
            }

            /* Adjusted mobile column widths */
            th:nth-child(1),
            td:nth-child(1) {
                width: 6%;
            }

            th:nth-child(2),
            td:nth-child(2) {
                width: 9%;
            }

            th:nth-child(3),
            td:nth-child(3) {
                width: 9%;
            }

            th:nth-child(4),
            td:nth-child(4) {
                width: 14%;
            }

            th:nth-child(5),
            td:nth-child(5) {
                width: 16%;
            }

            th:nth-child(6),
            td:nth-child(6) {
                width: 12%;
            }

            th:nth-child(7),
            td:nth-child(7) {
                width: 11%;
            }

            th:nth-child(8),
            td:nth-child(8) {
                width: 13%;
            }

            th:nth-child(9),
            td:nth-child(9) {
                width: 10%;
            }

            .admin-img,
            .img-placeholder {
                width: 40px;
                height: 40px;
                font-size: 16px;
            }

            .status {
                padding: 5px 8px;
                font-size: 11px;
                min-width: 70px;
            }

            .superadmin-badge {
                font-size: 8px;
                padding: 1px 4px;
            }

            .pagination-info {
                font-size: 13px;
                padding: 8px 14px;
            }

            .page-btn {
                min-width: 38px;
                height: 38px;
                font-size: 13px;
            }

            .action-btn {
                padding: 8px 10px;
                font-size: 12px;
                min-width: 85px;
            }
        }

        /* Small Mobile (below 400px) */
        @media (max-width: 399px) {
            .admin-management {
                padding: 10px;
            }

            .btn {
                padding: 6px 12px;
                font-size: 12px;
            }

            .btn i {
                font-size: 12px;
            }

            .search-box input {
                font-size: 13px;
                padding: 8px 12px 8px 36px;
            }

            .search-box i {
                left: 12px;
                font-size: 16px;
            }

            table {
                min-width: 950px;
            }

            th,
            td {
                padding: 10px 8px !important;
                font-size: 12px !important;
            }

            .admin-img,
            .img-placeholder {
                width: 36px;
                height: 36px;
                font-size: 14px;
            }

            .status {
                padding: 4px 6px;
                font-size: 10px;
                min-width: 65px;
            }

            .action-btn {
                padding: 6px 8px;
                font-size: 11px;
                min-width: 75px;
            }

            .page-btn {
                min-width: 34px;
                height: 34px;
                font-size: 12px;
                padding: 0 6px;
            }

            .pagination-info {
                font-size: 12px;
                padding: 6px 12px;
            }

            .modal-header h3 {
                font-size: 18px;
            }

            .close-btn {
                width: 38px;
                height: 38px;
                font-size: 28px;
            }
        }
    </style>
</head>

<body>
    <header>
        <div class="header-left">
            <i class="fa fa-bars" id="menu-control"></i>
            <img src="/assets/logo.png" alt="logo" id="logo">
            <h2 class="logo-text">Resolvia</h2>
        </div>

        <div class="header-right">
            <div class="profile-icon">
                <i class="fa fa-user"></i>
            </div>
            <button class="logout-btn" id="logout-btn">
                <i class="fa fa-sign-out-alt"></i>
                <span>Logout</span>
            </button>
        </div>
    </header>

    <div class="navigation-menu" id="navigation-menu">
        <ul id="nav-list"></ul>
    </div>

    <div class="main-content" id="main-content">
        <div class="admin-management">
            <div class="admin-header">
                <h2>Admin Management</h2>
                <div class="btn-group">
                    <button class="btn btn-primary" id="addAdminBtn">
                        <i class="fas fa-user-plus"></i> Add Admin
                    </button>
                </div>
            </div>

            <!-- Superadmin Notice -->
            <div class="superadmin-notice" id="superadminNotice" style="display: none;">
                <i class="fas fa-crown"></i>
                <span>Superadmin accounts are marked with golden background and cannot be edited</span>
            </div>

            <div class="search-container">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="searchInput" placeholder="Search by name or email...">
                </div>
                <button class="btn-search" id="searchBtn">
                    <i class="fas fa-search"></i> Search
                </button>
            </div>

            <div class="table-controls">
                <div class="entries-selector">
                    <span>Show</span>
                    <select id="entriesPerPage">
                        <option value="5">5</option>
                        <option value="10" selected>10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    <span>entries</span>
                </div>
            </div>

            <div class="table-container">
                <table id="adminTable">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>ID</th>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody">
                        <!-- Data will be populated by JavaScript -->
                    </tbody>
                </table>
            </div>

            <div class="pagination">
                <div class="pagination-info" id="paginationInfo">
                    Showing 1-10 of 0 admins
                </div>
                <div class="pagination-controls">
                    <button class="page-btn" id="prevPage" disabled>
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="page-btn active">1</button>
                    <button class="page-btn" id="nextPage">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Admin Modal -->
    <div id="adminModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="adminModalTitle">Add Admin</h3>
                <button class="close-btn" id="closeAdminModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="adminForm">
                    <div class="image-upload-container">
                        <div class="image-preview" id="imagePreview">
                            <i class="fas fa-user" style="font-size: 30px; color: #666;"></i>
                        </div>
                        <div>
                            <button type="button" class="upload-btn" id="uploadImageBtn">
                                <i class="fas fa-upload"></i> Upload Image
                            </button>
                            <input type="file" id="imageInput" class="file-input" accept="image/*">
                            <p style="font-size: 11px; color: #666; margin-top: 5px;">Supports JPG, PNG, GIF (Max 2MB)
                            </p>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="adminId">Admin ID *</label>
                            <input type="text" id="adminId" class="form-control" required pattern="[A-Za-z0-9\-_]+"
                                title="Only letters, numbers, hyphens, and underscores allowed">
                            <div class="error-message" id="adminIdError">Admin ID must be unique</div>
                            <small style="font-size: 11px; color: #666;">Enter a unique identifier</small>
                        </div>
                        <div class="form-group">
                            <label for="adminName">Full Name *</label>
                            <input type="text" id="adminName" class="form-control" required>
                            <div class="error-message" id="adminNameError">Name is required</div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="adminEmail">Email *</label>
                            <input type="email" id="adminEmail" class="form-control" required>
                            <div class="error-message" id="adminEmailError">Valid email is required</div>
                        </div>
                        <div class="form-group">
                            <label for="adminStatus">Status *</label>
                            <select id="adminStatus" class="form-control" required>
                                <option value="">Select Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                            <div class="error-message" id="adminStatusError">Status is required</div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="adminPassword">Password *</label>
                            <input type="password" id="adminPassword" class="form-control">
                            <div class="error-message" id="adminPasswordError">Password must be at least 6 characters
                            </div>
                            <small style="font-size: 11px; color: #666;">Required for new admin. Leave empty to keep
                                current password when editing.</small>
                        </div>
                        <div class="form-group">
                            <label for="adminConfirmPassword">Confirm Password *</label>
                            <input type="password" id="adminConfirmPassword" class="form-control">
                            <div class="error-message" id="adminConfirmPasswordError">Passwords must match</div>
                        </div>
                    </div>

                    <!-- Superadmin Field (Hidden and Read-only for editing) -->
                    <div class="form-group" id="superadminField" style="display: none;">
                        <label for="isSuperadmin">Superadmin Status</label>
                        <input type="text" id="isSuperadmin" class="form-control" readonly
                            style="background-color: #f5f5f5;">
                        <small style="font-size: 11px; color: #666;">Superadmin status cannot be changed</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancelAdminBtn">Cancel</button>
                <button class="btn btn-primary" id="saveAdminBtn">Save</button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="/public/js/api.js"></script>
    <script src="/public/js/common-script.js"></script>
    <script>
        // ==============================================
        // FIXED VERSION - All code in one place
        // ==============================================

        // API Base URL
        const API_BASE_URL = '/api';

        // Global variables
        let currentPage = 1;
        let itemsPerPage = 10;
        let totalAdmins = 0;
        let totalPages = 1;
        let currentAdminId = null;
        let isCurrentAdminSuperadmin = false;

        // Show notification
        function showNotification(message, type = 'success') {
            // Remove existing notifications
            const existingNotifications = document.querySelectorAll('.custom-notification');
            existingNotifications.forEach(note => note.remove());

            // Create notification
            const notification = document.createElement('div');
            notification.className = `custom-notification ${type}`;
            notification.innerHTML = `
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            `;

            // Add styles if not already added
            if (!document.querySelector('#notification-styles')) {
                const style = document.createElement('style');
                style.id = 'notification-styles';
                style.textContent = `
                    .custom-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        border-radius: 4px;
                        color: white;
                        font-size: 14px;
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        min-width: 300px;
                        max-width: 400px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        animation: slideIn 0.3s ease-out;
                    }
                    
                    .custom-notification.success {
                        background-color: #4caf50;
                        border-left: 4px solid #2e7d32;
                    }
                    
                    .custom-notification.error {
                        background-color: #f44336;
                        border-left: 4px solid #c62828;
                    }
                    
                    .custom-notification.warning {
                        background-color: #ff9800;
                        border-left: 4px solid #ef6c00;
                    }
                    
                    .notification-close {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0 0 0 10px;
                        opacity: 0.8;
                    }
                    
                    .notification-close:hover {
                        opacity: 1;
                    }
                    
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);

            // Auto remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);

            // Close button functionality
            notification.querySelector('.notification-close').addEventListener('click', () => {
                notification.remove();
            });
        }

        // Initialize table
        async function renderTable() {
            try {
                const searchTerm = document.getElementById('searchInput').value.trim();
                const response = await fetch(
                    `${API_BASE_URL}/admins?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}`,
                    { credentials: 'include' }
                );

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const result = await response.json();
                const tableBody = document.getElementById('adminTableBody');
                tableBody.innerHTML = '';

                if (result.data.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-gray);">
                                <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                                No admins found.
                            </td>
                        </tr>
                    `;
                } else {
                    let hasSuperadmin = false;

                    result.data.forEach((admin, index) => {
                        const rowNumber = ((currentPage - 1) * itemsPerPage) + index + 1;
                        const isSuperadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;
                        if (isSuperadmin) hasSuperadmin = true;

                        const row = document.createElement('tr');
                        if (isSuperadmin) row.classList.add('superadmin-row');

                        const imageCell = admin.picture
                            ? `<img src="${admin.picture}" alt="${admin.name}" class="admin-img" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiIGZpbGw9IiMxOTg3NzQiLz4KPHBhdGggZD0iTTIwIDIyQzIyLjIwOTEgMjIgMjQgMjAuMjA5MSAyNCAxOEMyNCAxNS43OTA5IDIyLjIwOTEgMTQgMjAgMTRDMTcuNzkwOSAxNCAxNiAxNS43OTA5IDE2IDE4QzE2IDIwLjIwOTEgMTcuNzkwOSAyMiAyMCAyMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yMCAyNEMyMy4zMTM3IDI0IDI2IDIxLjMxMzcgMjYgMThDMjYgMTQuNjg2MyAyMy4zMTM3IDEyIDIwIDEyQzE2LjY4NjMgMTIgMTQgMTQuNjg2MyAxNCAxOEMxNCAyMS4zMTM3IDE2LjY4NjMgMjQgMjAgMjRaTTIwIDI1QzE2LjEzMzcgMjUgMTMgMjguMTMzNyAxMyAzMkgxMy4xN0MxMy4wNiAzMi40OCAxMyAzMi45OCAxMyAzMy41VjM0QzEzIDM1LjEwNDYgMTMuODk1NCAzNiAxNSAzNkgyNUM2LjEwNDYgMzYgMjcgMzUuMTA0NiAyNyAzNFYzMy41QzI3IDMyLjk4IDI2Ljk0IDMyLjQ4IDI2LjgzIDMySDI3QzI3IDI4LjEzMzcgMjMuODY2MyAyNSAyMCAyNVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=';">`
                            : `<div class="img-placeholder"><i class="fas fa-user"></i></div>`;

                        const statusClass = admin.status === 'Active' ? 'active' : 'inactive';
                        const roleDisplay = isSuperadmin
                            ? `<span>Admin <span class="superadmin-badge">Super</span></span>`
                            : 'Admin';

                        const formattedDate = new Date(admin.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });

                        const actionButton = isSuperadmin
                            ? `<button class="action-btn" disabled style="opacity: 0.5; cursor: not-allowed;">
                                   <i class="fas fa-lock"></i> Locked
                               </button>`
                            : `<button class="action-btn edit-btn" data-id="${admin.id}">
                                   <i class="fas fa-edit"></i> Edit
                               </button>`;

                        row.innerHTML = `
                            <td>${rowNumber}</td>
                            <td>${admin.id}</td>
                            <td>${imageCell}</td>
                            <td>${admin.name}</td>
                            <td>${admin.email}</td>
                            <td>${roleDisplay}</td>
                            <td><span class="status ${statusClass}">${admin.status}</span></td>
                            <td>${formattedDate}</td>
                            <td>${actionButton}</td>
                        `;

                        tableBody.appendChild(row);
                    });

                    document.getElementById('superadminNotice').style.display = hasSuperadmin ? 'block' : 'none';
                }

                totalAdmins = result.pagination.total;
                totalPages = result.pagination.pages;
                updatePagination();

            } catch (error) {
                console.error('Error rendering table:', error);
                showNotification('Error loading admins', 'error');
            }
        }

        // Update pagination
        function updatePagination() {
            const startItem = ((currentPage - 1) * itemsPerPage) + 1;
            const endItem = Math.min(currentPage * itemsPerPage, totalAdmins);

            document.getElementById('paginationInfo').textContent = `Showing ${startItem}-${endItem} of ${totalAdmins} admins`;

            const prevBtn = document.getElementById('prevPage');
            const nextBtn = document.getElementById('nextPage');

            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages || totalPages === 0;

            const controls = document.querySelector('.pagination-controls');
            const existingBtns = controls.querySelectorAll('.page-btn:not(#prevPage):not(#nextPage)');
            existingBtns.forEach(btn => btn.remove());

            const maxVisiblePages = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderTable();
                });
                controls.insertBefore(pageBtn, nextBtn);
            }
        }

        // Reset form
        function resetAdminForm() {
            document.getElementById('adminForm').reset();
            document.getElementById('imagePreview').innerHTML = '<i class="fas fa-user" style="font-size: 30px; color: #666;"></i>';
            document.getElementById('adminModalTitle').textContent = 'Add Admin';
            document.getElementById('superadminField').style.display = 'none';
            document.getElementById('isSuperadmin').value = '';

            currentAdminId = null;
            isCurrentAdminSuperadmin = false;

            // Clear errors
            document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.form-group').forEach(el => el.classList.remove('has-error'));
        }

        // Open modal for adding
        function openAddAdminModal() {
            console.log('Add Admin button clicked!');
            resetAdminForm();
            document.getElementById('adminModal').style.display = 'block';
        }

        // Open modal for editing
        async function openEditAdminModal(adminId) {
            try {
                const response = await fetch(`${API_BASE_URL}/admins/${adminId}`, {
                    credentials: 'include',
                });
                const result = await response.json();

                if (!result.success) throw new Error(result.message);

                const admin = result.data;
                resetAdminForm();

                currentAdminId = adminId;
                isCurrentAdminSuperadmin = admin.is_superadmin === 1 || admin.is_superadmin === true;
                document.getElementById('adminModalTitle').textContent = 'Edit Admin';

                document.getElementById('adminId').value = admin.id;
                document.getElementById('adminName').value = admin.name;
                document.getElementById('adminEmail').value = admin.email;
                document.getElementById('adminStatus').value = admin.status;

                if (isCurrentAdminSuperadmin) {
                    document.getElementById('superadminField').style.display = 'block';
                    document.getElementById('isSuperadmin').value = 'Superadmin (Cannot be changed)';
                    document.getElementById('adminId').readOnly = true;
                    document.getElementById('adminId').style.backgroundColor = '#f5f5f5';
                }

                if (admin.picture) {
                    document.getElementById('imagePreview').innerHTML = `<img src="${admin.picture}" alt="Preview">`;
                }

                document.getElementById('adminModal').style.display = 'block';
            } catch (error) {
                console.error('Error fetching admin:', error);
                showNotification('Error loading admin details', 'error');
            }
        }

        // Validate form
        function validateAdminForm() {
            let isValid = true;
            const errors = {
                adminId: document.getElementById('adminIdError'),
                adminName: document.getElementById('adminNameError'),
                adminEmail: document.getElementById('adminEmailError'),
                adminStatus: document.getElementById('adminStatusError'),
                adminPassword: document.getElementById('adminPasswordError'),
                adminConfirmPassword: document.getElementById('adminConfirmPasswordError')
            };

            // Clear errors
            Object.values(errors).forEach(error => {
                error.style.display = 'none';
                error.parentElement.classList.remove('has-error');
            });

            // Validate fields
            const fields = {
                adminId: document.getElementById('adminId'),
                adminName: document.getElementById('adminName'),
                adminEmail: document.getElementById('adminEmail'),
                adminStatus: document.getElementById('adminStatus')
            };

            Object.entries(fields).forEach(([key, field]) => {
                if (!field.value.trim()) {
                    field.parentElement.classList.add('has-error');
                    errors[key].textContent = `${field.previousElementSibling.textContent.replace('*', '').trim()} is required`;
                    errors[key].style.display = 'block';
                    isValid = false;
                }
            });

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (fields.adminEmail.value && !emailRegex.test(fields.adminEmail.value)) {
                fields.adminEmail.parentElement.classList.add('has-error');
                errors.adminEmail.textContent = 'Please enter a valid email address';
                errors.adminEmail.style.display = 'block';
                isValid = false;
            }

            // Validate password
            const password = document.getElementById('adminPassword').value;
            const confirmPassword = document.getElementById('adminConfirmPassword').value;

            if (!currentAdminId) {
                // New admin - password required
                if (!password) {
                    document.getElementById('adminPassword').parentElement.classList.add('has-error');
                    errors.adminPassword.textContent = 'Password is required for new admin';
                    errors.adminPassword.style.display = 'block';
                    isValid = false;
                } else if (password.length < 6) {
                    document.getElementById('adminPassword').parentElement.classList.add('has-error');
                    errors.adminPassword.textContent = 'Password must be at least 6 characters';
                    errors.adminPassword.style.display = 'block';
                    isValid = false;
                } else if (password !== confirmPassword) {
                    document.getElementById('adminConfirmPassword').parentElement.classList.add('has-error');
                    errors.adminConfirmPassword.textContent = 'Passwords do not match';
                    errors.adminConfirmPassword.style.display = 'block';
                    isValid = false;
                }
            } else if (password) {
                // Editing admin - password optional but must be valid if provided
                if (password.length < 6) {
                    document.getElementById('adminPassword').parentElement.classList.add('has-error');
                    errors.adminPassword.textContent = 'Password must be at least 6 characters';
                    errors.adminPassword.style.display = 'block';
                    isValid = false;
                } else if (password !== confirmPassword) {
                    document.getElementById('adminConfirmPassword').parentElement.classList.add('has-error');
                    errors.adminConfirmPassword.textContent = 'Passwords do not match';
                    errors.adminConfirmPassword.style.display = 'block';
                    isValid = false;
                }
            }

            return isValid;
        }

        // Save admin
        async function saveAdmin() {
            if (!validateAdminForm()) return;

            if (isCurrentAdminSuperadmin) {
                showNotification('Superadmin accounts cannot be modified', 'error');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('id', document.getElementById('adminId').value.trim());
                formData.append('name', document.getElementById('adminName').value.trim());
                formData.append('email', document.getElementById('adminEmail').value.trim());
                formData.append('status', document.getElementById('adminStatus').value);
                formData.append('is_superadmin', 'false');

                const password = document.getElementById('adminPassword').value.trim();
                if (password) formData.append('password', password);

                const imageFile = document.getElementById('imageInput').files[0];
                if (imageFile) formData.append('picture', imageFile);

                const url = currentAdminId
                    ? `${API_BASE_URL}/admins/${currentAdminId}`
                    : `${API_BASE_URL}/admins`;

                const method = currentAdminId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    credentials: 'include',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
                    body: formData
                });

                const result = await response.json();

                if (!result.success) throw new Error(result.message);

                showNotification(currentAdminId ? 'Admin updated!' : 'Admin added!', 'success');
                document.getElementById('adminModal').style.display = 'none';
                renderTable();

            } catch (error) {
                console.error('Error saving admin:', error);
                showNotification(error.message || 'Error saving admin', 'error');
            }
        }

        // Initialize everything
        function initializeAdminManagement() {
            console.log('Initializing Admin Management...');

            // Get all DOM elements
            const addAdminBtn = document.getElementById('addAdminBtn');
            const searchBtn = document.getElementById('searchBtn');
            const searchInput = document.getElementById('searchInput');
            const entriesPerPage = document.getElementById('entriesPerPage');
            const prevPageBtn = document.getElementById('prevPage');
            const nextPageBtn = document.getElementById('nextPage');
            const closeModalBtn = document.getElementById('closeAdminModal');
            const cancelBtn = document.getElementById('cancelAdminBtn');
            const saveBtn = document.getElementById('saveAdminBtn');
            const uploadBtn = document.getElementById('uploadImageBtn');
            const imageInput = document.getElementById('imageInput');
            const adminModal = document.getElementById('adminModal');

            // Check if elements exist
            if (!addAdminBtn) {
                console.error('Add Admin button not found!');
                return;
            }

            console.log('All DOM elements found successfully');

            // ========== EVENT LISTENERS ==========

            // Add Admin button - FIXED
            addAdminBtn.addEventListener('click', openAddAdminModal);
            console.log('Add Admin button event listener attached');

            // Search functionality
            searchBtn.addEventListener('click', () => {
                currentPage = 1;
                renderTable();
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentPage = 1;
                    renderTable();
                }
            });

            // Entries per page
            entriesPerPage.addEventListener('change', () => {
                itemsPerPage = parseInt(entriesPerPage.value);
                currentPage = 1;
                renderTable();
            });

            // Pagination
            prevPageBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                }
            });

            nextPageBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                }
            });

            // Modal buttons
            closeModalBtn.addEventListener('click', () => {
                adminModal.style.display = 'none';
            });

            cancelBtn.addEventListener('click', () => {
                adminModal.style.display = 'none';
            });

            saveBtn.addEventListener('click', saveAdmin);

            // Image upload
            uploadBtn.addEventListener('click', () => {
                imageInput.click();
            });

            imageInput.addEventListener('change', function (e) {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                    alert('Image size must be less than 2MB');
                    return;
                }

                if (!file.type.match('image.*')) {
                    alert('Please select an image file');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (e) {
                    document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            });

            // Close modal when clicking outside
            window.addEventListener('click', (e) => {
                if (e.target === adminModal) {
                    adminModal.style.display = 'none';
                }
            });

            // Edit button delegation
            document.addEventListener('click', async (e) => {
                if (e.target.closest('.edit-btn')) {
                    const btn = e.target.closest('.edit-btn');
                    const adminId = btn.getAttribute('data-id');
                    await openEditAdminModal(adminId);
                }
            });

            // ID validation
            let idCheckTimeout;
            document.getElementById('adminId').addEventListener('input', async function () {
                const id = this.value.trim();
                clearTimeout(idCheckTimeout);

                if (id.length < 3) return;

                idCheckTimeout = setTimeout(async () => {
                    try {
                        if (currentAdminId && id === currentAdminId) return;

                        const response = await fetch(`${API_BASE_URL}/admins/${id}`, {
                            credentials: 'include',
                        });
                        const result = await response.json();

                        if (result.success) {
                            document.getElementById('adminId').parentElement.classList.add('has-error');
                            document.getElementById('adminIdError').textContent = 'This Admin ID already exists';
                            document.getElementById('adminIdError').style.display = 'block';
                        }
                    } catch (error) {
                        // ID doesn't exist - that's good
                        document.getElementById('adminId').parentElement.classList.remove('has-error');
                        document.getElementById('adminIdError').style.display = 'none';
                    }
                }, 500);
            });

            // Initial render
            renderTable();
            console.log('Admin Management initialized successfully!');
        }

        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', initializeAdminManagement);

        // Also try to initialize if DOM is already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAdminManagement);
        } else {
            initializeAdminManagement();
        }



    </script>
</body>

</html>