export interface SectionDefinition {
  key: string;
  label: string;
  defaultContent: string;
}

export interface PageDefinition {
  title: string;
  sections: SectionDefinition[];
}

export const PAGE_DEFINITIONS: Record<string, PageDefinition> = {
  "customer-service": {
    title: "Customer Service",
    sections: [
      {
        key: "intro",
        label: "About Our Support",
        defaultContent: `<p>At CF Coral, we're passionate about helping you succeed with your reef aquarium. Our customer service team consists of experienced reef hobbyists who understand the unique needs of coral enthusiasts. Whether you have a question about a specific coral species, need help with acclimation, or have a concern about your order, we're here to help.</p>
<p>We pride ourselves on fast, knowledgeable responses and stand behind every coral we ship. Your satisfaction — and the health of your reef — is our top priority.</p>`,
      },
      {
        key: "faq",
        label: "Frequently Asked Questions",
        defaultContent: `<h3>How do I acclimate new corals?</h3>
<p>We recommend the drip acclimation method for all new coral arrivals. Float the sealed bag in your tank for 15 minutes to equalize temperature, then slowly drip tank water into the bag over 30–45 minutes before introducing the coral to your system.</p>
<h3>What water parameters do you recommend?</h3>
<p>Most of our corals thrive at: Temperature 76–78°F, Salinity 1.025–1.026, pH 8.1–8.3, Alkalinity 8–11 dKH, Calcium 400–450 ppm, Magnesium 1250–1350 ppm.</p>
<h3>Do you offer a live arrival guarantee?</h3>
<p>Yes! We guarantee live arrival on all livestock orders. See our Shipping &amp; Returns page for full details on our Live Arrival Guarantee policy.</p>
<h3>How quickly do you ship?</h3>
<p>Orders placed before 12 PM EST Monday–Wednesday are typically shipped the same day. We do not ship on Thursdays or Fridays to prevent packages from sitting over the weekend.</p>
<h3>Can I hold my order for a specific date?</h3>
<p>Yes, you can request a specific ship date during checkout or by contacting us. We'll do our best to accommodate your preferred delivery window.</p>`,
      },
      {
        key: "contact-info",
        label: "Contact Information",
        defaultContent: `<p>Our support team is available Monday–Friday, 9 AM – 5 PM EST.</p>
<ul>
  <li><strong>Email:</strong> support@coralstore.com</li>
  <li><strong>Response time:</strong> Within 24 hours on business days</li>
  <li><strong>Instagram:</strong> @CoralStoreLive</li>
</ul>
<p>For urgent livestock concerns (e.g., DOA claims), please email us with photos within 2 hours of delivery. Include your order number in the subject line for fastest service.</p>`,
      },
    ],
  },

  "shipping-returns": {
    title: "Shipping & Returns",
    sections: [
      {
        key: "shipping-policy",
        label: "Shipping Policy",
        defaultContent: `<p>We ship live corals and livestock Monday through Wednesday only, to ensure packages never sit in transit over a weekend. All orders are shipped via FedEx Overnight or Priority Overnight to minimize transit time and stress on the animals.</p>
<p>Orders placed before 12 PM EST on a shipping day are eligible for same-day shipment. Orders placed after the cutoff or on non-shipping days will be scheduled for the next available shipping day.</p>
<p>We carefully pack all orders with insulated boxes, heat packs (in winter), and cold packs (in summer) to maintain safe temperatures throughout transit.</p>`,
      },
      {
        key: "shipping-rates",
        label: "Shipping Rates & Methods",
        defaultContent: `<h3>Florida Residents</h3>
<p>Flat-rate overnight shipping is available at a reduced rate for Florida residents due to shorter transit distances.</p>
<h3>All Other States</h3>
<p>FedEx Priority Overnight shipping is required for all other domestic addresses. Exact rates are calculated at checkout based on your location.</p>
<h3>Free Shipping</h3>
<p>Orders over $250 qualify for complimentary overnight shipping (excludes live rock and oversized items).</p>
<h3>Important Notes</h3>
<ul>
  <li>We do not ship internationally at this time.</li>
  <li>We cannot ship to P.O. boxes — a physical street address is required.</li>
  <li>Someone must be available to receive the package on the delivery day.</li>
</ul>`,
      },
      {
        key: "returns-policy",
        label: "Returns Policy",
        defaultContent: `<p>Due to the living nature of our products, we are unable to accept returns on livestock (corals, fish, or invertebrates). All sales are final once livestock has shipped.</p>
<p>For dry goods (equipment, supplies, and accessories), we accept returns within 30 days of delivery provided the item is unused, in original packaging, and in resalable condition. Contact us to initiate a return. Return shipping costs are the customer's responsibility unless the item arrived damaged or defective.</p>
<p>If you received an incorrect item, please contact us within 48 hours of delivery and we will resolve the issue at no cost to you.</p>`,
      },
      {
        key: "doa-policy",
        label: "Live Arrival Guarantee",
        defaultContent: `<p>We guarantee that all livestock will arrive alive and healthy. If any animal arrives dead or severely stressed, please follow these steps:</p>
<ul>
  <li>Take clear photos or a short video of the deceased animal still in the unopened bag within 2 hours of delivery.</li>
  <li>Email us at support@coralstore.com with your order number and the photos/video.</li>
  <li>Do not discard the animal or packaging until your claim has been processed.</li>
</ul>
<p>Upon verification, we will issue store credit or a replacement at our discretion. We are unable to honor DOA claims submitted after 2 hours of the confirmed delivery time.</p>
<p><strong>The Live Arrival Guarantee is void if:</strong> the customer was unavailable to receive the package on the delivery date, the address provided was incorrect, or FedEx delivery was delayed due to weather or other circumstances outside our control.</p>`,
      },
    ],
  },

  "privacy-policy": {
    title: "Privacy Policy",
    sections: [
      {
        key: "overview",
        label: "Overview",
        defaultContent: `<p>Last updated: March 2025</p>
<p>CF Coral ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our website and services. By using our site, you agree to the practices described in this policy.</p>`,
      },
      {
        key: "data-collection",
        label: "Data We Collect",
        defaultContent: `<p>We collect information you provide directly to us, such as:</p>
<ul>
  <li><strong>Account information:</strong> Name, email address, and password when you create an account.</li>
  <li><strong>Order information:</strong> Shipping address, billing details, and purchase history when you place an order.</li>
  <li><strong>Communications:</strong> Messages you send us through the contact form or email.</li>
</ul>
<p>We also automatically collect certain information when you visit our site, including your IP address, browser type, device information, and pages visited.</p>`,
      },
      {
        key: "data-use",
        label: "How We Use Your Data",
        defaultContent: `<p>We use the information we collect to:</p>
<ul>
  <li>Process and fulfill your orders, including sending shipping notifications.</li>
  <li>Manage your account and provide customer support.</li>
  <li>Send promotional emails and newsletters (you may opt out at any time).</li>
  <li>Improve our website, products, and services.</li>
  <li>Detect and prevent fraud and unauthorized access.</li>
  <li>Comply with legal obligations.</li>
</ul>`,
      },
      {
        key: "cookies",
        label: "Cookies & Tracking",
        defaultContent: `<p>We use cookies and similar tracking technologies to enhance your experience on our site. Cookies help us remember your preferences, keep your cart intact between sessions, and understand how visitors use our site.</p>
<p>You can control cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website (for example, your shopping cart may not function correctly).</p>`,
      },
      {
        key: "third-parties",
        label: "Third-Party Services",
        defaultContent: `<p>We share information with trusted third parties only as necessary to operate our business:</p>
<ul>
  <li><strong>Stripe:</strong> Processes payment transactions securely. We never store your full card details on our servers.</li>
  <li><strong>FedEx:</strong> Receives your shipping address to deliver your orders.</li>
  <li><strong>Analytics providers:</strong> Help us understand website traffic and usage patterns using aggregated, anonymized data.</li>
</ul>
<p>We do not sell your personal information to third parties.</p>`,
      },
      {
        key: "contact",
        label: "Contact Us",
        defaultContent: `<p>If you have any questions or concerns about this Privacy Policy or your personal data, please contact us:</p>
<ul>
  <li><strong>Email:</strong> privacy@coralstore.com</li>
  <li><strong>Mailing address:</strong> CF Coral, 123 Reef Way, Miami, FL 33101</li>
</ul>
<p>We will respond to all privacy-related inquiries within 30 days.</p>`,
      },
    ],
  },

  "terms-of-service": {
    title: "Terms of Service",
    sections: [
      {
        key: "acceptance",
        label: "Acceptance of Terms",
        defaultContent: `<p>Last updated: March 2025</p>
<p>By accessing or using the CF Coral website (the "Site") or placing an order with us, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Site. We reserve the right to update these Terms at any time, and continued use of the Site after changes constitutes acceptance of the updated Terms.</p>`,
      },
      {
        key: "accounts",
        label: "User Accounts",
        defaultContent: `<p>When you create an account on our Site, you are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to:</p>
<ul>
  <li>Provide accurate and current information when creating your account.</li>
  <li>Notify us immediately of any unauthorized use of your account.</li>
  <li>Not share your account credentials with any third party.</li>
</ul>
<p>We reserve the right to suspend or terminate accounts that violate these Terms or that we believe are being used fraudulently.</p>`,
      },
      {
        key: "payments",
        label: "Payments & Orders",
        defaultContent: `<p>All prices on our Site are listed in US dollars and are subject to change without notice. By placing an order, you authorize us to charge your payment method for the total order amount including any applicable taxes and shipping fees.</p>
<p>We reserve the right to cancel or refuse any order at our discretion, including in cases of suspected fraud, pricing errors, or product unavailability. If an order is cancelled after payment, a full refund will be issued to the original payment method.</p>
<p>All sales on livestock are final once the order has shipped. Please see our Shipping &amp; Returns page for our Live Arrival Guarantee policy.</p>`,
      },
      {
        key: "live-animal",
        label: "Live Animal Policy",
        defaultContent: `<p>By purchasing live corals, fish, or invertebrates from CF Coral, you acknowledge and agree to the following:</p>
<ul>
  <li>You have a suitable, established aquarium system prepared and ready to receive livestock prior to ordering.</li>
  <li>You understand that keeping marine animals requires knowledge, proper equipment, and ongoing maintenance.</li>
  <li>You will be present or arrange for a responsible adult to receive the shipment on the delivery date.</li>
  <li>You accept the inherent risks associated with keeping live marine animals, including the risk of death after acclimation.</li>
</ul>
<p>We are not responsible for livestock losses that occur after successful delivery and acclimation due to unsuitable water parameters, incompatible tankmates, or other environmental factors outside our control.</p>`,
      },
      {
        key: "limitation",
        label: "Limitation of Liability",
        defaultContent: `<p>To the maximum extent permitted by applicable law, CF Coral shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site or purchase of our products, even if we have been advised of the possibility of such damages.</p>
<p>Our total liability for any claim arising from or related to our products or services shall not exceed the amount you paid for the specific product or service giving rise to the claim.</p>`,
      },
      {
        key: "changes",
        label: "Changes to Terms",
        defaultContent: `<p>We reserve the right to modify these Terms of Service at any time. We will notify users of significant changes by posting a notice on our Site or by sending an email to registered account holders. The updated Terms will be effective upon posting, and your continued use of the Site after that date constitutes acceptance of the revised Terms.</p>
<p>If you have any questions about these Terms, please contact us at legal@coralstore.com.</p>`,
      },
    ],
  },
};
