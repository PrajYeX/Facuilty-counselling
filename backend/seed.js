import dotenv from 'dotenv';
import { sequelize, User, ScoringCriteria, College, DepartmentSeat, OptionEntry, Setting } from './models/index.js';

dotenv.config();

const criteriaData = [
  {
    name: 'M.Tech Completed',
    description: 'Faculty holds M.Tech or PhD degree',
    field: 'qualifications.highestDegree',
    condition: { operator: 'in', value: ['M.Tech', 'PhD'] },
    points: 3
  },
  {
    name: 'PhD Completed',
    description: 'Faculty holds a PhD degree',
    field: 'qualifications.highestDegree',
    condition: { operator: 'eq', value: 'PhD' },
    points: 5
  },
  {
    name: 'Experience 5+ years',
    description: '5 or more years of teaching experience',
    field: 'qualifications.yearsOfExperience',
    condition: { operator: 'gte', value: 5 },
    points: 2
  },
  {
    name: 'Experience 10+ years',
    description: '10 or more years of teaching experience',
    field: 'qualifications.yearsOfExperience',
    condition: { operator: 'gte', value: 10 },
    points: 4
  },
  {
    name: 'NET/SET Qualified',
    description: 'Faculty has cleared NET or SET exam',
    field: 'qualifications.netSetQualified',
    condition: { operator: 'eq', value: true },
    points: 3
  },
  {
    name: 'Research Papers 5+',
    description: 'Published 5 or more research papers',
    field: 'qualifications.researchPapers',
    condition: { operator: 'gte', value: 5 },
    points: 2
  }
];

const categoryData = [
  { key: 'WOMEN', label: 'Women' },
  { key: 'PWD', label: 'Persons with Disability' }
];

// Seats per department: a number means all General, an object splits by category.
const collegeData = [
  { name: 'Government Engineering College', code: 'GEC01', location: 'Bengaluru', district: 'Bengaluru Urban', tier: 'Tier 1',
    seats: { 'Computer Science': { GEN: 1, WOMEN: 1 }, 'Electronics': 1, 'Mechanical': 1 } },
  { name: 'City Institute of Technology', code: 'CIT02', location: 'Mysuru', district: 'Mysuru', tier: 'Tier 2',
    seats: { 'Computer Science': 2, 'Electronics': 2 } },
  { name: 'Rural College of Engineering', code: 'RCE03', location: 'Hassan', district: 'Hassan', tier: 'Tier 3',
    seats: { 'Computer Science': 1, 'Mechanical': 2 } }
];

// Demo faculty: [name, degree, specialization, experience, papers, netSet, dateOfBirth, category, options as college codes]
const facultyData = [
  ['Asha Rao', 'PhD', 'Computer Science', 12, 8, true, '1980-04-12', 'WOMEN', ['GEC01', 'CIT02', 'RCE03']],
  ['Vikram Shetty', 'PhD', 'Computer Science', 12, 8, true, '1978-09-30', 'GEN', ['GEC01', 'CIT02']],
  ['Meera Nair', 'M.Tech', 'Computer Science', 6, 3, true, '1988-01-05', 'WOMEN', ['CIT02', 'GEC01', 'RCE03']],
  ['Rahul Gowda', 'M.Tech', 'Electronics', 7, 5, false, '1986-07-21', 'GEN', ['GEC01', 'CIT02']],
  ['Kavya Hegde', 'PhD', 'Mechanical', 10, 6, true, '1982-11-11', 'WOMEN', ['GEC01', 'RCE03']],
  ['Suresh Kumar', 'B.Tech', 'Mechanical', 3, 0, false, '1992-03-17', 'PWD', ['RCE03']],
  ['Divya Patil', 'M.Tech', 'Computer Science', 4, 1, false, '1990-06-02', 'WOMEN', ['GEC01', 'CIT02', 'RCE03']]
];

const seedDatabase = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synced (tables created)');

    // Create Admin User
    await User.create({
      name: 'Admin',
      email: 'admin@faculty.com',
      password: 'admin123',
      role: 'admin',
      verificationStatus: 'verified'
    });
    console.log('Admin user created (admin@faculty.com / admin123)');

    // Create Scoring Criteria
    await ScoringCriteria.bulkCreate(criteriaData);
    console.log('6 scoring criteria seeded');

    await Setting.upsert({ key: 'categories', value: categoryData });
    console.log(`Categories seeded: General, ${categoryData.map(c => c.label).join(', ')}`);

    const seatsByCode = {};
    for (const { seats, ...college } of collegeData) {
      const quotas = Object.values(seats).map(s => (typeof s === 'number' ? { GEN: s } : s));
      const created = await College.create({
        ...college,
        totalSeats: quotas.reduce((sum, q) => sum + Object.values(q).reduce((a, n) => a + n, 0), 0)
      });
      for (const [department, value] of Object.entries(seats)) {
        const categorySeats = typeof value === 'number' ? { GEN: value } : value;
        const totalSeats = Object.values(categorySeats).reduce((sum, n) => sum + n, 0);
        const seat = await DepartmentSeat.create({ collegeId: created.id, department, totalSeats, categorySeats });
        seatsByCode[`${college.code}:${department}`] = seat.id;
      }
    }
    console.log(`${collegeData.length} colleges with department seats seeded`);

    for (const [index, [name, highestDegree, specialization, yearsOfExperience, researchPapers, netSetQualified, dateOfBirth, category, codes]] of facultyData.entries()) {
      const faculty = await User.create({
        name,
        email: `faculty${index + 1}@faculty.com`,
        password: 'faculty123',
        role: 'faculty',
        dateOfBirth,
        category,
        qualifications: { highestDegree, specialization, yearsOfExperience, researchPapers, netSetQualified },
        documents: [],
        verificationStatus: 'verified'
      });
      const seatIds = codes.map(code => seatsByCode[`${code}:${specialization}`]).filter(Boolean);
      await OptionEntry.bulkCreate(seatIds.map((seatId, i) => ({ facultyId: faculty.id, seatId, priority: i + 1 })));
    }
    console.log(`${facultyData.length} verified demo faculty with options seeded (faculty1..${facultyData.length}@faculty.com / faculty123)`);

    const gec = await College.findOne({ where: { code: 'GEC01' } });
    await User.create({
      name: 'GEC01 Admissions',
      email: 'college1@faculty.com',
      password: 'college123',
      role: 'college',
      collegeId: gec.id,
      verificationStatus: 'verified'
    });
    console.log('College login created for GEC01 (college1@faculty.com / college123)');

    console.log('\nSeed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();
