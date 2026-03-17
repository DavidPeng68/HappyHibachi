import {
  generateCustomerEmail,
  generateAdminEmail,
  generateConfirmedEmail,
} from '../../../functions/api/_email';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseBooking = {
  name: 'John Doe',
  date: '2026-06-15',
  time: '18:00',
  guestCount: 10,
  region: 'la',
};

const baseAdminBooking = {
  ...baseBooking,
  id: 'booking-abc-123',
  email: 'john@example.com',
  phone: '909-615-6633',
  formType: 'booking',
};

const sampleOrderData = {
  packageName: 'Premium Hibachi',
  priceModel: 'per-person',
  guestCount: 10,
  kidsCount: 2,
  serviceType: 'hibachi',
  serviceDuration: 120,
  proteins: ['Chicken', 'Steak'],
  addons: [{ name: 'Gyoza', quantity: 3, unitPrice: 3 }],
  estimatedTotal: 850,
};

// ---------------------------------------------------------------------------
// generateCustomerEmail
// ---------------------------------------------------------------------------

describe('generateCustomerEmail', () => {
  it('returns valid HTML with DOCTYPE', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('contains the customer name', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('John Doe');
  });

  it('contains the formatted date', () => {
    const html = generateCustomerEmail(baseBooking);
    // Should contain "Monday, June 15, 2026" (en-US long format)
    expect(html).toContain('June');
    expect(html).toContain('15');
    expect(html).toContain('2026');
  });

  it('contains the time', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('18:00');
  });

  it('contains the guest count', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('10 people');
  });

  it('contains the region in uppercase', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('LA');
  });

  it('contains Google Calendar link', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('calendar.google.com');
    expect(html).toContain('Google Calendar');
  });

  it('contains Outlook Calendar link', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('outlook.live.com');
    expect(html).toContain('Outlook');
  });

  it('contains contact information', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('909-615-6633');
    expect(html).toContain('familyfriendshibachi@gmail.com');
  });

  it('contains branding', () => {
    const html = generateCustomerEmail(baseBooking);
    expect(html).toContain('Family Friends Hibachi');
  });

  describe('with order data', () => {
    const bookingWithOrder = { ...baseBooking, orderData: sampleOrderData };

    it('includes package name', () => {
      const html = generateCustomerEmail(bookingWithOrder);
      expect(html).toContain('Premium Hibachi');
    });

    it('includes proteins', () => {
      const html = generateCustomerEmail(bookingWithOrder);
      expect(html).toContain('Chicken');
      expect(html).toContain('Steak');
    });

    it('includes add-ons with quantity', () => {
      const html = generateCustomerEmail(bookingWithOrder);
      expect(html).toContain('Gyoza');
      expect(html).toContain('x3');
    });

    it('includes estimated total', () => {
      const html = generateCustomerEmail(bookingWithOrder);
      expect(html).toContain('$850');
    });
  });

  describe('without order data', () => {
    it('does not include order section markers', () => {
      const html = generateCustomerEmail(baseBooking);
      expect(html).not.toContain('Est. Total');
      expect(html).not.toContain('Package');
    });
  });

  describe('XSS prevention', () => {
    it('escapes HTML in name', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        name: '<script>alert("xss")</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes HTML in time', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        time: '18:00<img src=x onerror=alert(1)>',
      });
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('escapes HTML in region', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        region: '<b>la</b>',
      });
      expect(html).not.toContain('<b>la</b>');
      expect(html).toContain('&lt;B&gt;LA&lt;/B&gt;');
    });
  });

  describe('edge cases', () => {
    it('handles missing time gracefully', () => {
      const html = generateCustomerEmail({ ...baseBooking, time: '' });
      expect(html).toContain('To be confirmed');
    });

    it('handles empty proteins array in order data', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        orderData: { ...sampleOrderData, proteins: [] },
      });
      // Should not crash; proteins section should be absent
      expect(html).toContain('<!DOCTYPE html>');
    });

    it('handles empty addons array in order data', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        orderData: { ...sampleOrderData, addons: [] },
      });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).not.toContain('Gyoza');
    });

    it('handles time with label like "Afternoon (13:00 - 15:00)"', () => {
      const html = generateCustomerEmail({
        ...baseBooking,
        time: 'Afternoon (13:00 - 15:00)',
      });
      // Should not crash and should contain the time display
      expect(html).toContain('Afternoon (13:00 - 15:00)');
      // Calendar URL should parse the time correctly
      expect(html).toContain('calendar.google.com');
    });
  });
});

// ---------------------------------------------------------------------------
// generateAdminEmail
// ---------------------------------------------------------------------------

describe('generateAdminEmail', () => {
  it('returns valid HTML', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('contains customer name', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('John Doe');
  });

  it('contains customer email', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('john@example.com');
  });

  it('contains customer phone', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('909-615-6633');
  });

  it('contains booking ID', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('booking-abc-123');
  });

  it('contains formatted date', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('June');
    expect(html).toContain('15');
  });

  it('contains region in uppercase', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('LA');
  });

  it('contains guest count', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('10 people');
  });

  it('indicates form type in header', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('New Booking Request');
  });

  it('shows "Estimate" for estimate form type', () => {
    const html = generateAdminEmail({ ...baseAdminBooking, formType: 'estimate' });
    expect(html).toContain('Estimate');
  });

  it('contains quick action buttons (Call, Text, Dashboard)', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('Call');
    expect(html).toContain('Text');
    expect(html).toContain('Dashboard');
  });

  it('contains admin dashboard link', () => {
    const html = generateAdminEmail(baseAdminBooking);
    expect(html).toContain('family-friends-hibachi.pages.dev/admin');
  });

  describe('with order data', () => {
    const adminWithOrder = { ...baseAdminBooking, orderData: sampleOrderData };

    it('includes package name and price model', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('Premium Hibachi');
      expect(html).toContain('per-person');
    });

    it('includes kids count when > 0', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('2 kids');
    });

    it('includes service type and duration', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('hibachi');
      expect(html).toContain('120 min');
    });

    it('includes proteins', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('Chicken');
      expect(html).toContain('Steak');
    });

    it('includes add-ons with quantity and unit price', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('Gyoza');
      expect(html).toContain('x3');
      expect(html).toContain('$3');
    });

    it('includes estimated total with unverified warning', () => {
      const html = generateAdminEmail(adminWithOrder);
      expect(html).toContain('$850');
      expect(html).toContain('Unverified');
    });

    it('shows "Chef\'s Choice" when no proteins selected', () => {
      const html = generateAdminEmail({
        ...baseAdminBooking,
        orderData: { ...sampleOrderData, proteins: [] },
      });
      expect(html).toContain("Chef's Choice");
    });

    it('omits kids text when kidsCount is 0', () => {
      const html = generateAdminEmail({
        ...baseAdminBooking,
        orderData: { ...sampleOrderData, kidsCount: 0 },
      });
      expect(html).not.toContain('kids');
    });
  });

  describe('with message/notes', () => {
    it('includes notes section when message is present', () => {
      const html = generateAdminEmail({ ...baseAdminBooking, message: 'Nut allergy for 2 guests' });
      expect(html).toContain('Notes');
      expect(html).toContain('Nut allergy for 2 guests');
    });

    it('omits notes section when message is absent', () => {
      const html = generateAdminEmail(baseAdminBooking);
      expect(html).not.toContain('Notes');
    });
  });

  describe('XSS prevention', () => {
    it('escapes HTML in all user-provided fields', () => {
      const html = generateAdminEmail({
        ...baseAdminBooking,
        name: '<script>alert(1)</script>',
        email: 'test@evil<img>.com',
        phone: '123<b>456</b>',
        message: '<div onclick="hack()">click</div>',
        id: 'id<script>',
      });
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img&gt;');
      expect(html).toContain('&lt;b&gt;');
      expect(html).toContain('&lt;div');
    });
  });
});

// ---------------------------------------------------------------------------
// generateConfirmedEmail
// ---------------------------------------------------------------------------

describe('generateConfirmedEmail', () => {
  it('returns valid HTML', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('contains "Booking Confirmed" header', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('Booking Confirmed');
  });

  it('contains customer name', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('John Doe');
  });

  it('contains formatted date', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('June');
    expect(html).toContain('2026');
  });

  it('contains guest count', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('10 people');
  });

  it('contains region in uppercase', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('LA');
  });

  it('contains Google and Outlook calendar links', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('calendar.google.com');
    expect(html).toContain('outlook.live.com');
  });

  it('contains setup reminders', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('power outlet');
    expect(html).toContain('seating');
  });

  it('contains contact phone', () => {
    const html = generateConfirmedEmail(baseBooking);
    expect(html).toContain('909-615-6633');
  });

  describe('with order data', () => {
    it('includes package name and estimated total', () => {
      const html = generateConfirmedEmail({ ...baseBooking, orderData: sampleOrderData });
      expect(html).toContain('Premium Hibachi');
      expect(html).toContain('$850');
    });
  });

  describe('without order data', () => {
    it('does not include order sections', () => {
      const html = generateConfirmedEmail(baseBooking);
      expect(html).not.toContain('Est. Total');
    });
  });

  describe('XSS prevention', () => {
    it('escapes HTML in customer name', () => {
      const html = generateConfirmedEmail({
        ...baseBooking,
        name: 'Eve<script>hack()</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('edge cases', () => {
    it('handles missing time gracefully', () => {
      const html = generateConfirmedEmail({ ...baseBooking, time: '' });
      expect(html).toContain('To be confirmed');
    });
  });
});
