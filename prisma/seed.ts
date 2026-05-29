import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@prokip.africa' },
    update: {},
    create: {
      fullName: 'Prokip Admin',
      email: 'admin@prokip.africa',
      phone: '+2340000000000',
      passwordHash: adminPassword,
      role: 'ADMIN',
      country: 'Nigeria',
    },
  })
  console.log('Admin created:', admin.email)

  // Create a state manager
  const smPassword = await hash('manager123', 12)
  const smUser = await prisma.user.upsert({
    where: { email: 'kano.manager@prokip.africa' },
    update: {},
    create: {
      fullName: 'Kano State Manager',
      email: 'kano.manager@prokip.africa',
      phone: '+2341111111111',
      passwordHash: smPassword,
      role: 'STATE_MANAGER',
      country: 'Nigeria',
      state: 'Kano',
    },
  })

  const stateManager = await prisma.stateManager.upsert({
    where: { userId: smUser.id },
    update: {},
    create: {
      userId: smUser.id,
      states: {
        create: [
          { name: 'Kano', country: 'Nigeria' },
        ],
      },
    },
  })

  // Create referral link
  await prisma.referralLink.upsert({
    where: { code: 'kano/sm123' },
    update: {},
    create: {
      code: 'kano/sm123',
      stateId: (await prisma.state.findFirst({ where: { name: 'Kano' } }))!.id,
      managerId: smUser.id,
    },
  })

  // Create a sample quiz
  const quiz = await prisma.quiz.upsert({
    where: { id: 'sample-quiz-1' },
    update: {},
    create: {
      id: 'sample-quiz-1',
      title: 'Prokip Agent Qualification Exam',
      description: 'Complete this exam to qualify as a Prokip agent.',
      status: 'PUBLISHED',
      duration: 30,
      passMark: 70,
      maxAttempts: 1,
      randomizeQuestions: true,
      randomizeOptions: true,
      allowBackNavigation: true,
      showResultToAgent: true,
      showScoreOnly: true,
    },
  })

  // Create sample questions
  const questions = [
    {
      text: 'What is the primary purpose of the Prokip platform?',
      type: 'MULTIPLE_CHOICE' as const,
      category: 'General',
      difficulty: 'EASY' as const,
      options: [
        { text: 'Social media management', isCorrect: false },
        { text: 'Agent qualification and management', isCorrect: true },
        { text: 'E-commerce platform', isCorrect: false },
        { text: 'Banking services', isCorrect: false },
      ],
    },
    {
      text: 'An agent must always verify customer identity before processing any transaction.',
      type: 'TRUE_FALSE' as const,
      category: 'Compliance',
      difficulty: 'EASY' as const,
      options: [
        { text: 'True', isCorrect: true },
        { text: 'False', isCorrect: false },
      ],
    },
    {
      text: 'Which of the following are required documents for agent registration?',
      type: 'MULTIPLE_ANSWERS' as const,
      category: 'Registration',
      difficulty: 'MEDIUM' as const,
      options: [
        { text: 'Valid ID card', isCorrect: true },
        { text: 'Proof of address', isCorrect: true },
        { text: 'Birth certificate', isCorrect: false },
        { text: 'Passport photograph', isCorrect: true },
      ],
    },
    {
      text: 'What should an agent do if they suspect fraudulent activity?',
      type: 'MULTIPLE_CHOICE' as const,
      category: 'Compliance',
      difficulty: 'MEDIUM' as const,
      options: [
        { text: 'Ignore it', isCorrect: false },
        { text: 'Report to the State Manager immediately', isCorrect: true },
        { text: 'Process the transaction anyway', isCorrect: false },
        { text: 'Block the customer account personally', isCorrect: false },
      ],
    },
    {
      text: 'A customer approaches your agent point requesting a cash withdrawal. They provide their account details but have no form of identification. Describe the correct procedure.',
      type: 'SCENARIO' as const,
      category: 'Operations',
      difficulty: 'HARD' as const,
      scenarioText: 'You are working at your agent point during a busy period. A customer who appears to be in a hurry asks you to process a large cash withdrawal. They claim to have forgotten their ID at home.',
      options: [
        { text: 'Process the withdrawal since they know their account details', isCorrect: false },
        { text: 'Decline the transaction and ask them to return with valid ID', isCorrect: true },
        { text: 'Process a smaller amount without ID', isCorrect: false },
        { text: 'Call the customer\'s family to verify identity', isCorrect: false },
      ],
    },
  ]

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const question = await prisma.question.create({
      data: {
        text: q.text,
        type: q.type,
        category: q.category,
        difficulty: q.difficulty,
        marks: 1,
        scenarioText: q.scenarioText || null,
        options: {
          create: q.options.map((opt, j) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: j,
          })),
        },
      },
    })

    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionId: question.id,
        order: i,
      },
    })
  }

  console.log('Sample quiz created with', questions.length, 'questions')
  console.log('\nSeed complete!')
  console.log('\nLogin credentials:')
  console.log('Admin: admin@prokip.africa / admin123')
  console.log('State Manager: kano.manager@prokip.africa / manager123')
  console.log('Registration link: /register/kano/sm123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
