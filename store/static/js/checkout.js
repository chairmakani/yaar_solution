class CheckoutForm {
    constructor() {
        this.form = document.getElementById('checkout-form');
        this.steps = document.querySelectorAll('.checkout-step');
        this.progressSteps = document.querySelectorAll('.progress-step');
        this.currentStep = 1;
        
        this.nextBtn = document.getElementById('next-step');
        this.prevBtn = document.getElementById('prev-step');
        this.initializeEventListeners();
        this.initializeFormValidation();
        this.initializeStepNavigation();
    }

    initializeEventListeners() {
        document.querySelectorAll('[data-action="next"]').forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });

        document.querySelectorAll('[data-action="prev"]').forEach(btn => {
            btn.addEventListener('click', () => this.prevStep());
        });
        
        // Add smooth transitions for steps
        this.steps.forEach(step => {
            step.addEventListener('transitionend', this.handleTransitionEnd);
        });
    }

    initializeFormValidation() {
        this.form.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('blur', (e) => this.validateField(e.target));
        });
    }

    initializeStepNavigation() {
        this.nextBtn.addEventListener('click', () => this.nextStep());
        this.prevBtn.addEventListener('click', () => this.prevStep());
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateSteps();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateSteps();
        }
    }

    updateSteps() {
        this.steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
            step.classList.toggle('slide-left', index + 1 < this.currentStep);
            step.classList.toggle('slide-right', index + 1 > this.currentStep);
        });

        this.progressSteps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 <= this.currentStep);
        });

        // Update navigation buttons
        this.prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        this.nextBtn.style.display = this.currentStep < 3 ? 'block' : 'none';
        this.nextBtn.textContent = this.currentStep === 2 ? 'Proceed to Payment' : 'Next';
    }

    validateCurrentStep() {
        const currentFields = this.steps[this.currentStep - 1].querySelectorAll('input, select');
        let isValid = true;
        currentFields.forEach(field => {
            if (field.required && !field.value) {
                isValid = false;
                this.showError(field);
            }
        });
        return isValid;
    }

    validateField(field) {
        const isValid = field.checkValidity();
        field.classList.toggle('is-valid', isValid);
        field.classList.toggle('is-invalid', !isValid);
        
        if (!isValid) {
            this.showError(field);
        } else {
            this.clearError(field);
        }
    }

    // ... Add more custom methods for form handling ...
}

class PaymentHandler {
    constructor(options) {
        this.razorpayOptions = options;
    }

    // ...existing PaymentHandler methods...
}

class AddressHandler {
    constructor() {
        this.pincodeInput = document.getElementById('billing-pincode');
        this.initializePincodeValidation();
    }

    initializePincodeValidation() {
        this.pincodeInput.addEventListener('change', async (e) => {
            const pincode = e.target.value;
            if (pincode.length === 6) {
                try {
                    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
                    const data = await response.json();
                    if (data[0].Status === 'Success') {
                        const address = data[0].PostOffice[0];
                        this.autoFillAddress(address);
                    }
                } catch (error) {
                    console.error('Error fetching pincode data:', error);
                }
            }
        });
    }

    autoFillAddress(address) {
        const cityInput = document.querySelector('[name="billing_city"]');
        const stateSelect = document.querySelector('[name="billing_state"]');
        
        if (cityInput) cityInput.value = address.District;
        if (stateSelect) {
            const stateOption = Array.from(stateSelect.options).find(option => 
                option.text.toLowerCase() === address.State.toLowerCase()
            );
            if (stateOption) stateOption.selected = true;
        }
    }
}

// Initialize on page load
function initializeCheckout(razorpayOptions) {
    const checkoutForm = new CheckoutForm();
    const paymentHandler = new PaymentHandler(razorpayOptions);
    const addressHandler = new AddressHandler();

    document.getElementById('place-order-btn').addEventListener('click', function() {
        const form = document.getElementById('checkout-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const selectedPaymentMethod = document.querySelector('input[name="payment"]:checked');
        if (!selectedPaymentMethod) {
            alert('Please select a payment method');
            return;
        }

        if (selectedPaymentMethod.id === 'razorpay') {
            paymentHandler.initializePayment();
        } else {
            form.submit();
        }
    });

    // Add shipping fields copy functionality
    document.getElementById('shipping-same').addEventListener('change', function(e) {
        const shippingFields = document.getElementById('shipping-fields');
        shippingFields.style.display = this.checked ? 'none' : 'block';
        
        if (!this.checked && !shippingFields.innerHTML.trim()) {
            // Clone billing fields to shipping fields
            const billingFields = document.querySelectorAll('[name^="billing_"]');
            let shippingHTML = '<div class="row">';
            billingFields.forEach(field => {
                const shippingField = field.cloneNode(true);
                shippingField.name = field.name.replace('billing_', 'shipping_');
                shippingField.value = '';
                shippingHTML += `<div class="${field.parentElement.className}">
                    ${field.previousElementSibling.outerHTML}
                    ${shippingField.outerHTML}
                </div>`;
            });
            shippingHTML += '</div>';
            shippingFields.innerHTML = shippingHTML;
        }
    });
}
