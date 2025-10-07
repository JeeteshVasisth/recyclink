import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. Some features will use mock data.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const chatSystemInstruction = `You are "Kabaadi Assistant", a friendly, helpful AI guide for "Kabaadi and Co", a platform connecting users with local scrap dealers (kabaadiwalas).

Your responsibilities are:
1.  Answer questions about what scrap we buy (Paper, Plastic, Metals, E-waste etc.).
2.  Provide *estimated* prices for scrap items when asked, but always state that "prices may vary based on location, quality, and current market rates." Example: "Newspaper is currently around ₹12-15 per kg, but the final price is set by the kabaadiwala."
3.  Explain our simple process: Schedule Pickup -> Kabaadiwala Arrives -> Weigh & Pay -> Responsible Recycling.
4.  Encourage users to use the "Scrap Identifier" for unknown items or the "Scrap Value Calculator" for estimates.
5.  Gently guide users to schedule a pickup using the contact form for any serious inquiries.
6.  If you don't know an answer, politely say, "That's a great question! For the most accurate information, please fill out our contact form, and a local expert will get in touch."

Keep your tone helpful and local. Use Indian currency symbol (₹) for prices. Keep answers concise (2-3 sentences).`;

let chat;

const startChat = () => {
    if (chat) return;
    if (!ai) {
        console.log("Mock chat session started as API key is not set.");
        return;
    }
    chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: chatSystemInstruction, thinkingConfig: { thinkingBudget: 0 } },
    });
};

const sendMessage = async (message) => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return `This is a mock AI response about "${message}". The API key is not configured.`;
    }
    if (!chat) startChat();
    try {
        const response = await chat.sendMessage({ message });
        return response.text.trim();
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        return "I'm sorry, but I encountered an error. Please try again in a moment.";
    }
};

const generateContactResponse = async (name) => {
  if (!ai) {
    return `Thank you for your request, ${name}! We've received it and are now connecting you with a verified kabaadiwala in your area. They will call you shortly to confirm the pickup time. Thanks for using Kabaadi and Co!`;
  }
  try {
    const prompt = `Generate a friendly, professional confirmation message for a user named "${name}" who just submitted a pickup request on our scrap collection website, 'Kabaadi and Co'. Reassure them that we're connecting them with a local kabaadiwala who will call them soon to confirm the details. Keep it concise, under 60 words.`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating contact response from Gemini:", error);
    return `Thank you, ${name}! Your pickup request has been received. A local kabaadiwala will contact you shortly.`;
  }
};

const identifyScrap = async (base64Image, mimeType) => {
  if (!ai) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return JSON.stringify({
      itemName: 'Old Newspapers',
      category: 'Paper',
      recyclable: true,
      estimatedPrice: '₹12-15 per kg'
    });
  }
  try {
    const prompt = `You are an expert scrap (kabaad) identifier for an Indian company, "Kabaadi and Co". Analyze the image to identify the primary scrap material.

    Respond only with a single, valid JSON object that conforms to the provided schema.

    - "itemName": The common name of the item (e.g., "Newspapers", "Copper Wire", "Plastic Bottles").
    - "category": Classify the item (e.g., 'Paper', 'Metals', 'Plastics', 'E-Waste').
    - "recyclable": A boolean value. True if it's recyclable scrap.
    - "estimatedPrice": A string with an estimated price range per kg or unit in Indian Rupees (₹). For example, "₹12-15 per kg" or "₹50-100 per piece". Include a disclaimer if the price is highly variable.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        itemName: { type: Type.STRING },
        category: { type: Type.STRING },
        recyclable: { type: Type.BOOLEAN },
        estimatedPrice: { type: Type.STRING },
      },
      required: ['itemName', 'category', 'recyclable', 'estimatedPrice'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, { inlineData: { data: base64Image, mimeType } }] },
      config: { responseMimeType: "application/json", responseSchema },
    });
    return response.text;
  } catch (error) {
    console.error("Error identifying scrap with Gemini:", error);
    throw new Error("Could not identify the item. Please try a clearer image.");
  }
};

const calculateScrapValue = async (scrapType, weight, unit) => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return JSON.stringify({
            estimatedValue: `₹${(Math.random() * 100 + 50).toFixed(0)} - ₹${(Math.random() * 150 + 100).toFixed(0)}`,
            environmentalImpact: {
                metric: "Water Saved",
                value: `Approx. ${(Math.random() * 1000).toFixed(0)} litres`
            },
            disclaimer: "This is a mock estimate. Prices vary based on market rates and quality."
        });
    }
    try {
        const prompt = `You are an environmental and financial analyst for "Kabaadi and Co". A user wants to calculate the value of their scrap.
        Data:
        - Type: "${scrapType}"
        - Weight/Quantity: "${weight} ${unit}"

        Respond ONLY with a single, valid JSON object conforming to the schema.
        - "estimatedValue": A string representing a realistic price range in Indian Rupees (₹).
        - "environmentalImpact": An object with a "metric" (e.g., "Trees Saved", "Water Saved", "Energy Saved") and a corresponding "value" (e.g., "Approx. 2", "Approx. 7000 litres").
        - "disclaimer": A brief note that prices are estimates.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                estimatedValue: { type: Type.STRING },
                environmentalImpact: {
                    type: Type.OBJECT,
                    properties: {
                        metric: { type: Type.STRING },
                        value: { type: Type.STRING },
                    },
                    required: ['metric', 'value']
                },
                disclaimer: { type: Type.STRING },
            },
            required: ['estimatedValue', 'environmentalImpact', 'disclaimer']
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: { responseMimeType: "application/json", responseSchema },
        });
        return response.text;
    } catch (error) {
        console.error("Error calculating scrap value with Gemini:", error);
        throw new Error("Could not calculate the value. Please try again.");
    }
};

document.addEventListener('DOMContentLoaded', () => {

    const header = document.querySelector('header');
    if (header) {
        const handleScroll = () => {
            if (window.scrollY > 10) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenuCloseButton = document.getElementById('mobile-menu-close-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuLinks = mobileMenu?.querySelectorAll('a, button');

    const toggleMobileMenu = () => {
        mobileMenu?.classList.toggle('translate-x-full');
        document.body.classList.toggle('overflow-hidden');
    };

    mobileMenuButton?.addEventListener('click', toggleMobileMenu);
    mobileMenuCloseButton?.addEventListener('click', toggleMobileMenu);

    mobileMenuLinks?.forEach(link => {
        link.addEventListener('click', () => {
            if (!mobileMenu.classList.contains('translate-x-full')) {
                toggleMobileMenu();
            }
        });
    });

    document.querySelectorAll('a[href^="#"], button[data-scroll-to]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href') || this.dataset.scrollTo;
            document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    const servicesContainer = document.querySelector('#services .grid');
    if (servicesContainer) {
        const services = [
          { icon: `<svg class="w-12 h-12 mb-4 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125-.504 1.125-1.125V10.5a1.125 1.125 0 00-1.125-1.125h-3.375M3 15h3.375c.621 0 1.125-.504 1.125-1.125V10.5a1.125 1.125 0 00-1.125-1.125H3M3 15V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v7.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15z" /></svg>`, title: 'Paper & Cardboard', description: 'Newspapers, books, magazines, and all types of cardboard boxes.' },
          { icon: `<svg class="w-12 h-12 mb-4 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 4.787a.75.75 0 00-1.01-.712l-7.22 3.011a.75.75 0 01-.54 0L4.01 4.075a.75.75 0 00-1.01.712v13.425a.75.75 0 001.01.712l7.22-3.011a.75.75 0 01.54 0l7.22 3.011a.75.75 0 001.01-.712V4.787z" /></svg>`, title: 'Plastics', description: 'PET bottles, milk jugs, containers, and other household plastic items.' },
          { icon: `<svg class="w-12 h-12 mb-4 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.478 5.408L2.25 6.634m18 0l-1.228-1.226M12 21.75V19.5M12 2.25V4.5m4.243 2.25l1.226-1.227M5.25 6.634l1.227-1.227M18.75 17.366l-1.227-1.226M6.477 17.366l-1.227 1.226M12 12a2.25 2.25 0 012.25 2.25V15a2.25 2.25 0 01-4.5 0v-.75A2.25 2.25 0 0112 12z" /></svg>`, title: 'Metals', description: 'Iron, steel, aluminum cans, copper wires, and brass items.' },
          { icon: `<svg class="w-12 h-12 mb-4 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m-6 0V15M9 12.75H6.75M15 12.75H12.75m-6 0H9m3 0h.008M12 15h.008m-3 0h.008m0 0h.008m2.992 0h.008M9 15v-2.25m3 2.25v-2.25m3-2.25V15M12 9.75l-1.5 1.5-1.5-1.5M12 9.75V7.5M12 9.75l1.5 1.5 1.5-1.5M15 5.25H9a3 3 0 00-3 3v3.75a3 3 0 003 3h6a3 3 0 003-3V8.25a3 3 0 00-3-3z" /></svg>`, title: 'E-Waste', description: 'Old laptops, mobile phones, chargers, TVs, and other electronics.' },
        ];
        services.forEach((service, index) => {
            const card = document.createElement('div');
            card.className = "animate-fade-in-up";
            card.style.animationDelay = `${index * 150}ms`;
            card.innerHTML = `
                <div class="bg-white p-8 rounded-lg shadow-lg card-hover-effect h-full">
                    ${service.icon}
                    <h3 class="text-2xl font-bold mb-3 text-brand-dark">${service.title}</h3>
                    <p class="text-brand-gray">${service.description}</p>
                </div>`;
            servicesContainer.appendChild(card);
        });
    }

    const processContainer = document.getElementById('process-steps-container');
    if (processContainer) {
        const steps = [
          { icon: `<svg class="w-16 h-16 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /></svg>`, title: '1: Schedule Pickup', description: 'Fill out our simple form to book a convenient time for collection.' },
          { icon: `<svg class="w-16 h-16 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, title: '2: Kabaadiwala Arrives', description: 'A verified local scrap dealer arrives at your doorstep on time.' },
          { icon: `<svg class="w-16 h-16 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`, title: '3: Weigh & Get Paid', description: 'Your items are weighed transparently, and you receive instant cash.' },
          { icon: `<svg class="w-16 h-16 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582" /></svg>`, title: '4: Eco-Friendly Recycling', description: 'Your scrap is sent for responsible recycling, protecting our planet.' },
        ];
        steps.forEach((step, index) => {
            const stepEl = document.createElement('div');
            stepEl.className = "flex flex-col items-center text-center p-4 md:w-1/4 animate-fade-in-up";
            stepEl.style.animationDelay = `${index * 200}ms`;
            stepEl.innerHTML = `<div class="bg-white p-6 rounded-full mb-6 shadow-md">${step.icon}</div><h3 class="text-2xl font-bold mb-3 text-brand-dark">${step.title}</h3><p class="text-brand-gray">${step.description}</p>`;
            processContainer.appendChild(stepEl);
            if (index < steps.length - 1) {
                const arrowEl = document.createElement('div');
                arrowEl.className = "hidden md:flex items-center justify-center w-auto";
                arrowEl.innerHTML = `<svg class="w-12 h-12 text-brand-orange opacity-30" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>`;
                processContainer.appendChild(arrowEl);
            }
        });
    }

    const identifierFileInput = document.getElementById('waste-upload-input');
    const identifierImagePreview = document.getElementById('waste-image-preview');
    const identifierResultArea = document.getElementById('identifier-result-area');
    let imageBase64 = null;
    let imageMimeType = null;

    const handleIdentifyClick = async () => {
        if (!imageBase64) return;
        showLoadingSpinner(identifierResultArea, 'Analyzing photo...');
        try {
            const jsonResponse = await identifyScrap(imageBase64, imageMimeType);
            const result = JSON.parse(jsonResponse);
            let resultHTML = `<div class="text-left">
                <div class="text-center">
                    <p class="text-brand-gray mb-1">Identified Item:</p>
                    <h3 class="text-3xl font-bold text-brand-dark mb-2">${result.itemName}</h3>
                    <p class="text-brand-gray mb-1">Category:</p>
                    <p class="text-lg text-brand-green mb-4 font-semibold">${result.category}</p>
                </div>`;
            if (result.recyclable) {
                resultHTML += `<div class="mt-6 pt-4 border-t border-gray-300 text-center">
                    <h4 class="text-xl font-bold text-brand-dark mb-2">Estimated Value</h4>
                    <p class="font-bold text-3xl text-brand-orange">${result.estimatedPrice}</p>
                    <p class="text-xs text-brand-gray mt-2">(Final price may vary based on quality & location)</p>
                </div>
                <div class="text-center mt-8">
                    <p class="text-green-600 font-bold mb-4">✅ We can collect this item!</p>
                    <button data-scroll-to="#contact" class="bg-brand-green hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-full">Schedule Pickup</button>
                </div>`;
            } else {
                resultHTML += `<div class="text-center mt-4"><p class="text-yellow-600 font-bold">⚠️ This may not be standard scrap. Please contact us for more information.</p></div>`;
            }
            resultHTML += `</div>`;
            identifierResultArea.innerHTML = resultHTML;
            document.querySelector('#identifier-result-area button[data-scroll-to]')?.addEventListener('click', function (e) {
                 e.preventDefault();
                 document.querySelector(this.dataset.scrollTo).scrollIntoView({ behavior: 'smooth' });
            });
        } catch (err) {
            identifierResultArea.innerHTML = `<p class="text-red-500 text-center">${err.message || 'An unexpected error occurred.'}</p>`;
        }
    };

    const resetIdentifierUI = () => {
        identifierResultArea.innerHTML = `<button id="waste-identify-button" class="bg-brand-orange hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed" disabled>Identify Scrap</button>`;
        document.getElementById('waste-identify-button')?.addEventListener('click', handleIdentifyClick);
    };
    resetIdentifierUI();

    identifierFileInput?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result !== 'string') return;
                identifierImagePreview.src = result;
                identifierImagePreview.classList.remove('hidden');
                document.getElementById('waste-upload-label').classList.add('hidden');
                const mimeTypeMatch = result.match(/^data:(image\/[a-zA-Z0-9-.+]+);base64,/);
                if (!mimeTypeMatch) return;
                imageMimeType = mimeTypeMatch[1];
                imageBase64 = result.substring(mimeTypeMatch[0].length);
                resetIdentifierUI();
                document.getElementById('waste-identify-button')?.removeAttribute('disabled');
            };
            reader.readAsDataURL(file);
        }
    });

    const showLoadingSpinner = (container, text = 'Calculating...') => {
        container.innerHTML = `
            <div class="text-center p-4">
                <svg class="animate-spin h-8 w-8 text-brand-green mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="mt-2 text-brand-gray">${text}</p>
            </div>`;
    };

    document.getElementById('value-calculator-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const scrapType = document.getElementById('scrap-type-calculator').value;
        const weight = document.getElementById('scrap-weight-calculator').value;
        const unit = document.getElementById('scrap-unit-calculator').value;
        const resultsContainer = document.getElementById('calculator-results');
        showLoadingSpinner(resultsContainer);
        try {
            const resultsJson = await calculateScrapValue(scrapType, weight, unit);
            const data = JSON.parse(resultsJson);
            resultsContainer.innerHTML = `
                <div>
                    <h4 class="text-xl font-bold text-brand-dark mb-4 text-center">Calculation Result:</h4>
                    <div class="bg-brand-light-gray p-6 rounded-lg border border-gray-200 text-center">
                       <p class="text-brand-gray">Estimated Value</p>
                       <p class="text-4xl font-bold text-brand-orange my-2">${data.estimatedValue}</p>
                       <div class="mt-4 pt-4 border-t">
                         <p class="text-brand-gray">Positive Environmental Impact</p>
                         <p class="text-xl font-semibold text-brand-green mt-1">${data.environmentalImpact.value} ${data.environmentalImpact.metric}</p>
                       </div>
                       <p class="text-xs text-gray-500 mt-4">${data.disclaimer}</p>
                    </div>
                </div>`;
        } catch(error) {
            resultsContainer.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        }
    });

    const contactForm = document.getElementById('contact-form');
    const contactFormContainer = document.getElementById('contact-form-container');
    const submitButton = document.getElementById('contact-submit-button');
    const errorP = document.getElementById('contact-form-error');

    contactForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        
        let isValid = true;
        for (const value of formData.values()) {
            if (!value) {
                isValid = false;
                break;
            }
        }

        if (!isValid) {
            errorP.textContent = 'Please fill out all fields.';
            errorP.classList.remove('hidden');
            return;
        }

        errorP.classList.add('hidden');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const geminiResponse = await generateContactResponse(name);
            contactFormContainer.innerHTML = `
                <div class="text-center p-8 bg-brand-green/10 border border-brand-green rounded-lg">
                  <h3 class="text-2xl font-bold text-white mb-2">Request Sent!</h3>
                  <p class="text-brand-light">${geminiResponse}</p>
                </div>`;
        } catch (error) {
            console.error('FAILED to submit form:', error);
            errorP.textContent = 'Something went wrong. Please try again.';
            errorP.classList.remove('hidden');
            submitButton.disabled = false;
            submitButton.textContent = 'Find My Kabaadiwala';
        }
    });

    const chatbotToggleButton = document.getElementById('chatbot-toggle-button');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotCloseButton = document.getElementById('chatbot-close-button');
    const chatbotMessagesContainer = document.getElementById('chatbot-messages');
    const chatbotForm = document.getElementById('chatbot-form');
    const chatbotInput = document.getElementById('chatbot-input');

    const toggleChatbot = (forceOpen = null) => {
        const isOpen = chatbotWindow.classList.contains('flex');
        if (forceOpen === true || (forceOpen === null && !isOpen)) {
            chatbotWindow.classList.remove('hidden');
            chatbotWindow.classList.add('flex');
            startChat();
            if (chatbotMessagesContainer.children.length === 0) {
                const welcomeMsg = document.createElement('div');
                welcomeMsg.className = 'flex justify-start';
                welcomeMsg.innerHTML = `<div class="bg-brand-light-gray p-3 rounded-lg max-w-[80%]"><p class="text-sm text-brand-dark">Hello! I'm your Kabaadi Assistant. Ask me anything about scrap prices, what we buy, or our process.</p></div>`;
                chatbotMessagesContainer.appendChild(welcomeMsg);
            }
        } else if (forceOpen === false || (forceOpen === null && isOpen)) {
            chatbotWindow.classList.remove('flex');
            chatbotWindow.classList.add('hidden');
        }
    };

    chatbotToggleButton?.addEventListener('click', () => toggleChatbot());
    chatbotCloseButton?.addEventListener('click', () => toggleChatbot(false));

    chatbotForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatbotInput.value.trim();
        if (!userMessage) return;

        const userMsgEl = document.createElement('div');
        userMsgEl.className = 'flex justify-end';
        userMsgEl.innerHTML = `<div class="bg-brand-green text-white p-3 rounded-lg max-w-[80%]"><p class="text-sm">${userMessage}</p></div>`;
        chatbotMessagesContainer.appendChild(userMsgEl);
        chatbotInput.value = '';

        const loadingMsgEl = document.createElement('div');
        loadingMsgEl.className = 'flex justify-start';
        loadingMsgEl.innerHTML = `<div class="bg-brand-light-gray p-3 rounded-lg"><svg class="animate-spin h-5 w-5 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
        chatbotMessagesContainer.appendChild(loadingMsgEl);
        chatbotMessagesContainer.scrollTop = chatbotMessagesContainer.scrollHeight;

        try {
            const botResponse = await sendMessage(userMessage);
            loadingMsgEl.remove();
            const botMsgEl = document.createElement('div');
            botMsgEl.className = 'flex justify-start';
            botMsgEl.innerHTML = `<div class="bg-brand-light-gray p-3 rounded-lg max-w-[80%]"><p class="text-sm text-brand-dark">${botResponse}</p></div>`;
            chatbotMessagesContainer.appendChild(botMsgEl);
            chatbotMessagesContainer.scrollTop = chatbotMessagesContainer.scrollHeight;
        } catch (error) {
            loadingMsgEl.remove();
            const errorMsgEl = document.createElement('div');
            errorMsgEl.className = 'flex justify-start';
            errorMsgEl.innerHTML = `<div class="bg-red-100 p-3 rounded-lg max-w-[80%]"><p class="text-sm text-red-600">Error: Could not send message.</p></div>`;
            chatbotMessagesContainer.appendChild(errorMsgEl);
            chatbotMessagesContainer.scrollTop = chatbotMessagesContainer.scrollHeight;
        }
    });
});
