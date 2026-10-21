
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const $ = (selector) => document.querySelector(selector);

    const passwordOutput = $('#passwordOutput');
    const copyBtn = $('#copyBtn');
    const copyMessage = $('#copyMessage');
    const regenerateBtn = $('#regenerateBtn');
    const generateBtn = $('#generateBtn');

    const lengthRange = $('#lengthRange');
    const lengthValue = $('#lengthValue');

    const uppercase = $('#uppercase');
    const lowercase = $('#lowercase');
    const numbers = $('#numbers');
    const symbols = $('#symbols');

    const pinMode = $('#pinMode');
    const mixedMode = $('#mixedMode');
    const excludeSimilar = $('#excludeSimilar');

    const strengthText = $('#strengthText');
    const strengthBar = $('#strengthBar');

    const historyList = $('#historyList');
    const clearHistoryBtn = $('#clearHistory');

    const themeToggle = $('#themeToggle');
    const themeIcon = $('.theme-icon');

    const menuToggle = $('#menuToggle');
    const navLinks = $('.nav-links');

    const CHARACTERS = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()-_=+[]{};:,.<>?/'
    };

    const SIMILAR_CHARACTERS = 'Il1O0';

    const HISTORY_LIMIT = 8;
    const STORAGE_HISTORY = 'arslanPasswordHistory';
    const STORAGE_THEME = 'arslanPasswordTheme';

    let currentPassword = '';
    let passwordHistory = [];
    let notificationTimer = null;

    function secureRandomInt(max) {
        if (!Number.isSafeInteger(max) || max <= 0) {
            throw new Error('Invalid random number range.');
        }

        if (!window.crypto || !window.crypto.getRandomValues) {
            throw new Error('Secure random number generation is unavailable in this browser.');
        }

        const range = 0x100000000;
        const limit = Math.floor(range / max) * max;
        const randomValues = new Uint32Array(1);

        do {
            window.crypto.getRandomValues(randomValues);
        } while (randomValues[0] >= limit);

        return randomValues[0] % max;
    }

    function secureShuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = secureRandomInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }

        return array;
    }

    function getSelectedCharacterSets() {
        const selected = [];

        if (uppercase.checked) {
            selected.push(CHARACTERS.uppercase);
        }

        if (lowercase.checked) {
            selected.push(CHARACTERS.lowercase);
        }

        if (numbers.checked) {
            selected.push(CHARACTERS.numbers);
        }

        if (symbols.checked) {
            selected.push(CHARACTERS.symbols);
        }

        return selected;
    }

    function cleanCharacterSet(characters) {
        if (!excludeSimilar.checked) {
            return characters;
        }

        return [...characters]
            .filter(character => !SIMILAR_CHARACTERS.includes(character))
            .join('');
    }

    function getGenerationSettings() {
        const length = Number(lengthRange.value);

        if (pinMode.checked) {
            return {
                length,
                sets: ['0123456789'],
                pin: true
            };
        }

        let sets = getSelectedCharacterSets();

        if (mixedMode.checked) {
            sets = [
                CHARACTERS.uppercase,
                CHARACTERS.lowercase,
                CHARACTERS.numbers,
                CHARACTERS.symbols
            ];
        }

        sets = sets.map(cleanCharacterSet).filter(Boolean);

        return {
            length,
            sets,
            pin: false
        };
    }

    function generateSecurePassword(settings) {
        const { length, sets, pin } = settings;

        if (!sets.length || !length || length < 4 || length > 64) {
            throw new Error('Choose a valid password length and at least one character type.');
        }

        const availableCharacters = [...new Set(sets.join(''))];

        if (!availableCharacters.length) {
            throw new Error('No available characters. Change your settings and try again.');
        }

        const passwordCharacters = [];

        if (pin) {
            for (let i = 0; i < length; i++) {
                passwordCharacters.push(
                    availableCharacters[secureRandomInt(availableCharacters.length)]
                );
            }

            return passwordCharacters.join('');
        }

        for (const characterSet of sets) {
            if (passwordCharacters.length < length) {
                passwordCharacters.push(
                    characterSet[secureRandomInt(characterSet.length)]
                );
            }
        }

        while (passwordCharacters.length < length) {
            passwordCharacters.push(
                availableCharacters[secureRandomInt(availableCharacters.length)]
            );
        }

        secureShuffle(passwordCharacters);

        return passwordCharacters.join('');
    }

    function showNotification(message, type = 'success') {
        clearTimeout(notificationTimer);

        copyMessage.textContent = message;
        copyMessage.classList.add('show');

        copyMessage.style.color =
            type === 'error'
                ? 'var(--danger)'
                : 'var(--success)';

        notificationTimer = setTimeout(() => {
            copyMessage.classList.remove('show');
        }, 2500);
    }

    function calculateStrength(password, settings) {
        if (!password) {
            return {
                label: '—',
                score: 0,
                color: 'var(--border)'
            };
        }

        if (settings.pin) {
            if (password.length >= 8) {
                return {
                    label: 'Good PIN',
                    score: 70,
                    color: 'var(--success)'
                };
            }

            if (password.length >= 6) {
                return {
                    label: 'Fair PIN',
                    score: 50,
                    color: 'var(--warning)'
                };
            }

            return {
                label: 'Short PIN',
                score: 25,
                color: 'var(--danger)'
            };
        }

        let poolSize = 0;

        for (const set of settings.sets) {
            poolSize += set.length;
        }

        const entropy = password.length * Math.log2(Math.max(poolSize, 1));

        if (entropy >= 100) {
            return {
                label: 'Very Strong',
                score: 100,
                color: 'var(--success)'
            };
        }

        if (entropy >= 75) {
            return {
                label: 'Strong',
                score: 80,
                color: 'var(--success)'
            };
        }

        if (entropy >= 55) {
            return {
                label: 'Good',
                score: 60,
                color: 'var(--accent)'
            };
        }

        if (entropy >= 35) {
            return {
                label: 'Fair',
                score: 40,
                color: 'var(--warning)'
            };
        }

        return {
            label: 'Weak',
            score: 20,
            color: 'var(--danger)'
        };
    }

    function updateStrength(password, settings) {
        const strength = calculateStrength(password, settings);

        strengthText.textContent = strength.label;
        strengthBar.style.width = `${strength.score}%`;
        strengthBar.style.background = strength.color;
    }

    function saveHistory() {
        try {
            localStorage.setItem(
                STORAGE_HISTORY,
                JSON.stringify(passwordHistory)
            );
        } catch {
            // History remains available for the current session.
        }
    }

    function loadHistory() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(STORAGE_HISTORY) || '[]'
            );

            if (Array.isArray(stored)) {
                passwordHistory = stored
                    .filter(item =>
                        typeof item === 'string' &&
                        item.length > 0 &&
                        item.length <= 64
                    )
                    .slice(0, HISTORY_LIMIT);
            }
        } catch {
            passwordHistory = [];
        }

        renderHistory();
    }

    function addToHistory(password) {
        passwordHistory = passwordHistory.filter(
            item => item !== password
        );

        passwordHistory.unshift(password);
        passwordHistory = passwordHistory.slice(0, HISTORY_LIMIT);

        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        historyList.replaceChildren();

        if (!passwordHistory.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-history';

            const icon = document.createElement('span');
            icon.textContent = '◌';

            const description = document.createElement('p');
            description.textContent =
                'Your generated passwords will appear here.';

            empty.append(icon, description);
            historyList.appendChild(empty);

            return;
        }

        passwordHistory.forEach(password => {
            const item = document.createElement('div');
            item.className = 'history-item';

            const value = document.createElement('span');
            value.className = 'history-password';
            value.textContent = password;

            const button = document.createElement('button');
            button.className = 'history-copy';
            button.type = 'button';
            button.textContent = 'Copy';
            button.setAttribute('aria-label', 'Copy historical password');

            button.addEventListener('click', async () => {
                await copyToClipboard(password);
            });

            item.append(value, button);
            historyList.appendChild(item);
        });
    }

    function updateLength() {
        lengthValue.textContent = lengthRange.value;
    }

    function generatePassword() {
        updateLength();

        try {
            const settings = getGenerationSettings();
            const password = generateSecurePassword(settings);

            currentPassword = password;
            passwordOutput.textContent = password;

            updateStrength(password, settings);
            addToHistory(password);

            copyBtn.querySelector('span').textContent = 'Copy';

            return true;
        } catch (error) {
            currentPassword = '';
            passwordOutput.textContent = 'Unable to generate';

            updateStrength('', { sets: [], pin: false });

            showNotification(
                error.message || 'Unable to generate a password.',
                'error'
            );

            return false;
        }
    }

    async function copyToClipboard(password) {
        if (!password) {
            showNotification('Generate a password first.', 'error');
            return;
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
            } else {
                const temporaryInput = document.createElement('textarea');

                temporaryInput.value = password;
                temporaryInput.setAttribute('readonly', '');
                temporaryInput.style.position = 'fixed';
                temporaryInput.style.opacity = '0';
                temporaryInput.style.pointerEvents = 'none';

                document.body.appendChild(temporaryInput);
                temporaryInput.select();

                const copied = document.execCommand('copy');
                temporaryInput.remove();

                if (!copied) {
                    throw new Error('Clipboard access was denied.');
                }
            }

            showNotification('Copied to clipboard');

            if (password === currentPassword) {
                copyBtn.querySelector('span').textContent = 'Copied ✓';

                setTimeout(() => {
                    copyBtn.querySelector('span').textContent = 'Copy';
                }, 1800);
            }
        } catch {
            showNotification(
                'Unable to copy. Check clipboard permissions.',
                'error'
            );
        }
    }

    function updateModes() {
        if (pinMode.checked) {
            uppercase.checked = false;
            lowercase.checked = false;
            numbers.checked = true;
            symbols.checked = false;

            uppercase.disabled = true;
            lowercase.disabled = true;
            numbers.disabled = true;
            symbols.disabled = true;

            mixedMode.checked = false;
        } else {
            uppercase.disabled = false;
            lowercase.disabled = false;
            numbers.disabled = false;
            symbols.disabled = false;
        }

        if (mixedMode.checked) {
            pinMode.checked = false;

            uppercase.checked = true;
            lowercase.checked = true;
            numbers.checked = true;
            symbols.checked = true;
        }

        if (mixedMode.checked || pinMode.checked) {
            uppercase.disabled = true;
            lowercase.disabled = true;
            numbers.disabled = true;
            symbols.disabled = true;
        } else {
            uppercase.disabled = false;
            lowercase.disabled = false;
            numbers.disabled = false;
            symbols.disabled = false;
        }

        generatePassword();
    }

    function updateTheme(theme) {
        const isLight = theme === 'light';

        document.body.classList.toggle('light-theme', isLight);

        if (themeIcon) {
            themeIcon.textContent = isLight ? '☀' : '☾';
        }

        if (themeToggle) {
            themeToggle.setAttribute(
                'aria-label',
                isLight ? 'Switch to dark theme' : 'Switch to light theme'
            );

            const label = themeToggle.querySelector('span:not(.theme-icon)');

            if (label) {
                label.textContent = isLight ? 'Light' : 'Dark';
            }
        }

        try {
            localStorage.setItem(STORAGE_THEME, theme);
        } catch {
            // Theme still works for the current session.
        }
    }

    function loadTheme() {
        let theme = 'dark';

        try {
            const savedTheme = localStorage.getItem(STORAGE_THEME);

            if (savedTheme === 'light' || savedTheme === 'dark') {
                theme = savedTheme;
            }
        } catch {
            theme = 'dark';
        }

        updateTheme(theme);
    }

    function toggleTheme() {
        const isLight = document.body.classList.contains('light-theme');

        updateTheme(isLight ? 'dark' : 'light');
    }

    function toggleMenu() {
        const isOpen = navLinks.classList.toggle('active');

        menuToggle.classList.toggle('active', isOpen);
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute(
            'aria-label',
            isOpen ? 'Close menu' : 'Open menu'
        );
    }

    function closeMenu() {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open menu');
    }

    generateBtn.addEventListener('click', generatePassword);
    regenerateBtn.addEventListener('click', generatePassword);

    copyBtn.addEventListener('click', () => {
        copyToClipboard(currentPassword);
    });

    lengthRange.addEventListener('input', () => {
        updateLength();
        generatePassword();
    });

    [uppercase, lowercase, numbers, symbols, excludeSimilar].forEach(input => {
        input.addEventListener('change', () => {
            if (!pinMode.checked && !mixedMode.checked) {
                generatePassword();
            }
        });
    });

    pinMode.addEventListener('change', updateModes);
    mixedMode.addEventListener('change', updateModes);

    clearHistoryBtn.addEventListener('click', () => {
        passwordHistory = [];
        saveHistory();
        renderHistory();
    });

    themeToggle.addEventListener('click', toggleTheme);

    menuToggle.addEventListener('click', toggleMenu);

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', event => {
        if (
            navLinks.classList.contains('active') &&
            !navLinks.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 680) {
            closeMenu();
        }
    });


    loadTheme();
    loadHistory();
    updateLength();
    updateModes();

    // Handle Contact Form Submission & Show Success Modal
    const contactForm = document.getElementById("contact-form");
    const successModal = document.getElementById("contact-success-modal");
    const closeSuccessModalBtn = document.getElementById("close-success-modal");

    if (contactForm && successModal) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault(); // Prevents page reload or mail redirection

            // Show success modal
            successModal.classList.add("active");

            // Reset form fields
            contactForm.reset();
        });

        if (closeSuccessModalBtn) {
            closeSuccessModalBtn.addEventListener("click", () => {
                successModal.classList.remove("active");
            });
        }
    }

});

