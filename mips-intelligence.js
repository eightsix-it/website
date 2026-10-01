(function () {
    'use strict';

    const form = document.getElementById('mips-demo-form');
    const formPanel = document.getElementById('form-panel');
    const successMessage = document.getElementById('success-message');
    const formError = document.getElementById('form-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const RATE_KEY = 'e86-mips-demo-at';
    const RATE_MS = 60000;
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    function showError(message) {
        formError.textContent = message;
        formError.classList.remove('hidden');
        formError.scrollIntoView({ behavior: scrollBehavior, block: 'center' });
    }

    function showSuccess() {
        formPanel.style.display = 'none';
        successMessage.style.display = 'block';
        successMessage.focus({ preventScroll: true });
        successMessage.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
    }

    function flag(field) {
        field.style.borderColor = 'rgba(214,40,40,0.6)';
        field.setAttribute('aria-invalid', 'true');
        field.addEventListener('input', function () {
            field.style.borderColor = '';
            field.removeAttribute('aria-invalid');
        }, { once: true });
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (submitBtn.disabled) return;

        if (form.querySelector('[name="botcheck"]').checked) {
            showSuccess();
            return;
        }

        const required = form.querySelectorAll('[required]');
        const emailField = form.querySelector('#demo-email');
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailField.value.trim());
        let missing = false;
        required.forEach(function (field) {
            if (!field.value.trim()) {
                missing = true;
                flag(field);
            }
        });
        if (!emailOk) flag(emailField);

        if (missing || !emailOk) {
            showError(missing
                ? 'Please fill in all required fields before submitting.'
                : 'That email address doesn\'t look right. Please check it and try again.');
            return;
        }

        let last = 0;
        try { last = parseInt(localStorage.getItem(RATE_KEY) || '0', 10) || 0; } catch (err) { last = 0; }
        if (Date.now() - last < RATE_MS) {
            showError('Please wait a minute before sending another request.');
            return;
        }

        formError.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">progress_activity</span> Sending...';

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: new FormData(form)
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error('Submission failed');
            try { localStorage.setItem(RATE_KEY, String(Date.now())); } catch (err) {}
            showSuccess();
        } catch (err) {
            showError('Something went wrong. Please try again or call us directly.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">send</span> Request demo';
        }
    });
})();
