const pool = require('./database');

/**
 * Database Migration Script
 * Creates all tables for the Fees Management System
 * Date: 2025-12-10
 */

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Starting database migration...');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'teacher', 'staff')),
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        profile_image VARCHAR(500),
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Users table created');

    // 2. Students Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        student_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20),
        alternate_phone VARCHAR(20),
        date_of_birth DATE,
        gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'India',
        guardian_name VARCHAR(255),
        guardian_phone VARCHAR(20),
        guardian_email VARCHAR(255),
        guardian_relation VARCHAR(50),
        admission_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
        profile_image VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Students table created');

    // 3. Courses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        course_code VARCHAR(50) UNIQUE NOT NULL,
        course_name VARCHAR(255) NOT NULL,
        description TEXT,
        duration_months INTEGER,
        fee_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        category VARCHAR(100),
        level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced', 'professional')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Courses table created');

    // 4. Batches Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        batch_code VARCHAR(50) UNIQUE NOT NULL,
        batch_name VARCHAR(255) NOT NULL,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE,
        schedule VARCHAR(255),
        max_students INTEGER DEFAULT 30,
        current_students INTEGER DEFAULT 0,
        instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        room_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'upcoming')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Batches table created');

    // 5. Enrollments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        enrollment_number VARCHAR(50) UNIQUE NOT NULL,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
        enrollment_date DATE DEFAULT CURRENT_DATE,
        total_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        discount_reason TEXT,
        final_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        balance_amount DECIMAL(10, 2) DEFAULT 0,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
        enrollment_status VARCHAR(20) DEFAULT 'active' CHECK (enrollment_status IN ('active', 'completed', 'cancelled', 'suspended')),
        completion_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, course_id, batch_id)
      )
    `);
    console.log('✓ Enrollments table created');

    // 6. Payments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'cheque', 'bank_transfer', 'upi', 'online')),
        transaction_id VARCHAR(100),
        cheque_number VARCHAR(50),
        bank_name VARCHAR(100),
        payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed', 'refunded')),
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Payments table created');

    // 7. Fee Dues Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_dues (
        id SERIAL PRIMARY KEY,
        enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        installment_number INTEGER NOT NULL,
        due_amount DECIMAL(10, 2) NOT NULL,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        balance_amount DECIMAL(10, 2) NOT NULL,
        due_date DATE NOT NULL,
        payment_date DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'waived')),
        reminder_sent BOOLEAN DEFAULT FALSE,
        reminder_count INTEGER DEFAULT 0,
        last_reminder_date TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(enrollment_id, installment_number)
      )
    `);
    console.log('✓ Fee Dues table created');

    // 8. Expense Categories Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        parent_category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Expense Categories table created');

    // 9. Expenses Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        expense_code VARCHAR(50) UNIQUE NOT NULL,
        category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        expense_date DATE DEFAULT CURRENT_DATE,
        payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'cheque', 'bank_transfer', 'upi', 'online')),
        vendor_name VARCHAR(255),
        vendor_contact VARCHAR(100),
        invoice_number VARCHAR(100),
        description TEXT,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
        attachment_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Expenses table created');

    // 10. Attendance Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
        attendance_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused', 'holiday')),
        check_in_time TIME,
        check_out_time TIME,
        marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, batch_id, attendance_date)
      )
    `);
    console.log('✓ Attendance table created');

    // 11. Inquiries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        inquiry_number VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        alternate_phone VARCHAR(20),
        course_interested INTEGER REFERENCES courses(id) ON DELETE SET NULL,
        inquiry_date DATE DEFAULT CURRENT_DATE,
        source VARCHAR(100) CHECK (source IN ('walk-in', 'phone', 'email', 'website', 'referral', 'social_media', 'advertisement', 'other')),
        status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'enrolled', 'closed')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        follow_up_date DATE,
        follow_up_count INTEGER DEFAULT 0,
        converted_to_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        conversion_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Inquiries table created');

    // 12. Notifications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) CHECK (type IN ('info', 'success', 'warning', 'error', 'reminder')),
        category VARCHAR(50) CHECK (category IN ('payment', 'enrollment', 'attendance', 'general', 'system')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Notifications table created');

    // 13. SMS Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER,
        recipient_type VARCHAR(50) CHECK (recipient_type IN ('student', 'guardian', 'user', 'inquiry')),
        phone_number VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        sms_type VARCHAR(50) CHECK (sms_type IN ('payment_reminder', 'due_alert', 'enrollment', 'attendance', 'general', 'promotional')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
        provider VARCHAR(50),
        provider_message_id VARCHAR(100),
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        error_message TEXT,
        cost DECIMAL(10, 4),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ SMS Logs table created');

    // 14. Email Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient_id INTEGER,
        recipient_type VARCHAR(50) CHECK (recipient_type IN ('student', 'guardian', 'user', 'inquiry')),
        email_address VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body TEXT NOT NULL,
        email_type VARCHAR(50) CHECK (email_type IN ('payment_receipt', 'enrollment', 'reminder', 'report', 'general', 'promotional')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
        provider VARCHAR(50),
        provider_message_id VARCHAR(100),
        sent_at TIMESTAMP,
        opened_at TIMESTAMP,
        error_message TEXT,
        attachments JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Email Logs table created');

    // 15. Documents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('student', 'enrollment', 'expense', 'inquiry', 'general')),
        entity_id INTEGER NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        description TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Documents table created');

    // 16. Settings Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'text')),
        category VARCHAR(100),
        description TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        is_editable BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Settings table created');

    // 17. User Activity Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        description TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ User Activity Logs table created');

    // Create Indexes for Performance Optimization
    console.log('\nCreating indexes...');

    // Users indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');

    // Students indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_email ON students(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_status ON students(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_students_name ON students(first_name, last_name)');

    // Courses indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category)');

    // Batches indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_batches_code ON batches(batch_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batches_course_id ON batches(course_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_batches_dates ON batches(start_date, end_date)');

    // Enrollments indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_batch_id ON enrollments(batch_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_payment_status ON enrollments(payment_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(enrollment_status)');

    // Payments indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_enrollment_id ON payments(enrollment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number)');

    // Fee Dues indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_fee_dues_enrollment_id ON fee_dues(enrollment_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fee_dues_student_id ON fee_dues(student_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fee_dues_status ON fee_dues(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_fee_dues_due_date ON fee_dues(due_date)');

    // Expenses indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)');

    // Attendance indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_attendance_batch_id ON attendance(batch_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status)');

    // Inquiries indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON inquiries(phone)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inquiries_date ON inquiries(inquiry_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_inquiries_assigned ON inquiries(assigned_to)');

    // Notifications indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)');

    // SMS Logs indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient_id, recipient_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at)');

    // Email Logs indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_id, recipient_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at)');

    // Documents indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)');

    // User Activity Logs indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON user_activity_logs(entity_type, entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON user_activity_logs(created_at)');

    console.log('✓ All indexes created');

    // Create triggers for updated_at timestamps
    console.log('\nCreating triggers...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const tablesWithUpdatedAt = [
      'users', 'students', 'courses', 'batches', 'enrollments', 
      'payments', 'fee_dues', 'expense_categories', 'expenses', 
      'attendance', 'inquiries', 'documents', 'settings'
    ];

    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    console.log('✓ All triggers created');

    // Insert default settings
    console.log('\nInserting default settings...');

    await client.query(`
      INSERT INTO settings (setting_key, setting_value, setting_type, category, description, is_public) VALUES
      ('institute_name', 'My Institute', 'string', 'general', 'Institute Name', true),
      ('institute_email', 'info@institute.com', 'string', 'general', 'Institute Email', true),
      ('institute_phone', '', 'string', 'general', 'Institute Phone', true),
      ('institute_address', '', 'text', 'general', 'Institute Address', true),
      ('currency_symbol', '₹', 'string', 'financial', 'Currency Symbol', true),
      ('currency_code', 'INR', 'string', 'financial', 'Currency Code', true),
      ('late_fee_percentage', '5', 'number', 'financial', 'Late Fee Percentage', false),
      ('payment_reminder_days', '7', 'number', 'notifications', 'Payment Reminder Days Before Due', false),
      ('sms_enabled', 'false', 'boolean', 'notifications', 'Enable SMS Notifications', false),
      ('email_enabled', 'true', 'boolean', 'notifications', 'Enable Email Notifications', false),
      ('max_discount_percentage', '50', 'number', 'financial', 'Maximum Discount Percentage', false),
      ('financial_year_start_month', '4', 'number', 'financial', 'Financial Year Start Month (1-12)', false),
      ('enable_attendance', 'true', 'boolean', 'features', 'Enable Attendance Module', false),
      ('enable_inquiries', 'true', 'boolean', 'features', 'Enable Inquiries Module', false)
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✓ Default settings inserted');

    await client.query('COMMIT');
    console.log('\n✅ Database migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 All migrations executed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
