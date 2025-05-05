# 🛍️ E-Commerce Platform

> 🚀 **Project Status:** Completed  
> ⚠️ **Note:** This repository contains the complete source code for an **E-commerce platform** developed with Django for the backend, and HTML, CSS, and JavaScript for the frontend.

## 📌 Project Overview

This project is a fully-functional **E-commerce platform** designed to provide a seamless shopping experience. It includes features like product listing, cart management, checkout, and user authentication. The platform is responsive and optimized for a smooth user experience across all devices.

### Key Features:

- 🛍️ **Product Listing & Detail Pages**  
  Products can be viewed in both grid and list formats. Product pages show detailed information, including name, price, description, tax info, and stock status.

- 🛒 **Shopping Cart Management**  
  Users can add products to the cart, adjust quantities, and see live stock validation. Cart updates are reflected in real-time.

- 💳 **Secure Checkout & Payment Integration**  
  Secure checkout process with a variety of payment options. Integrates with a payment gateway for processing UPI or cash payments.

- 👤 **User Authentication**  
  Register and log in using either a phone number, email, or social accounts (e.g., Gmail). OTP verification ensures secure registration.

- 🔧 **Admin Dashboard**  
  Admins can manage products, monitor stock levels, view orders, and update product details from an intuitive dashboard.

- 📱 **Mobile-Responsive Design**  
  Fully responsive design to ensure usability on all devices (mobiles, tablets, desktops).

- 🏷️ **Product Variants & Dynamic Pricing**  
  Supports products with variants (e.g., size, color) and dynamic pricing adjustments based on user selections.

## 🔨 Tech Stack

- **Frontend:**  
  - HTML, CSS, JavaScript
  - Bootstrap for responsiveness
  - jQuery (optional for AJAX handling)

- **Backend:**  
  - Python, Django
  - Django Rest Framework (optional for API endpoints)
  
- **Database:**  
  - SQLite (for development) / PostgreSQL (for production)
  
- **Version Control:**  
  - Git & GitHub for versioning

- **Deployment:**  
  - Heroku, Render, or Koyeb (can be used for deployment)

## 🚀 Installation & Setup

Follow these steps to set up the project locally:

### 1. Clone the repository:

```
git clone https://github.com/chairmakani/yaar_solution.git
```
```
cd ecommerce
```

### 2. Set up a Python virtual environment:

```
python -m venv venv
```
```
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
### 3. Install dependencies:

```
pip install -r requirements.txt
```

### 4. Set up your database:

```
python manage.py migrate
```

### 5. Create a superuser (optional for admin dashboard):

```
python manage.py createsuperuser
```

### 6. Run the development server:

```
python manage.py runserver
```

# E-commerce Project

This is a Django-based e-commerce platform designed with a mobile-responsive layout and integrated payment gateway for UPI payments. It supports manual payment verification and order confirmation.

## Project Structure


## Admin Panel

The project comes with a built-in Django admin panel to manage:

- **Products** (Add, Update, Delete)
- **Categories** (Add, Update, Delete)
- **Orders** (View, Update Order Status)
- **User Accounts**

To access the admin panel, create a superuser and visit [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

## Mobile-Responsive Design

The platform is designed with responsiveness in mind, adapting seamlessly from grid view to list view depending on screen size:

- **Grid View** (Mobile): Displays product image, name, price, and "Add to Cart" button.
- **List View** (Large screens): Displays full product details, including tax information, stock status, and descriptions.

## Payment Integration

The checkout process includes UPI payment gateway integration. Payments can be verified manually using screenshots, and order confirmations are updated after manual validation.

## Contributing

We welcome contributions to improve the project. If you'd like to contribute, follow these steps:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Questions?

If you have any questions, issues, or feedback, feel free to create an issue or contact us directly.
