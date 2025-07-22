import { UserRole } from "@prisma/client";
import prisma from "../../shared/prisma";
import config from "../../config";
import * as bcrypt from "bcrypt";

export const initiateSuperAdmin = async () => {

  //start seeding
  console.log('🌱 Seeding database...')


  const payload: any = {
    firstName: "Super",
    lastName: "Admin",
    email: "belalhossain22000@gmail.com",
    phone: "12345678",
    role: UserRole.SUPER_ADMIN,
  };
  const hashedPassword: string = await bcrypt.hash(
    "12345678",
    Number(config.bcrypt_salt_rounds)
  );

  const isExistUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isExistUser) return;

  await prisma.user.create({
    data: { ...payload, password: hashedPassword },
  });

  // Create resources
  const resources = [
    { name: 'Conference Room A' },
    { name: 'Conference Room B' },
    { name: 'Projector Unit 1' },
    { name: 'Laptop Cart' },
    { name: 'Video Equipment Set' }
  ]

  console.log('Creating resources...')

  for (const resource of resources) {
    await prisma.resource.upsert({
      where: { name: resource.name },
      update: {},
      create: resource,
    })
    console.log(`✅ Created resource: ${resource.name}`)
  }


  // Create some sample bookings for demo purposes
  const createdResources = await prisma.resource.findMany()
  
  console.log('Creating sample bookings...')
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const sampleBookings = [
    {
      resourceId: createdResources[0].id,
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM today
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),   // 10 AM today
      requestedBy: 'John Doe',
    },
    {
      resourceId: createdResources[0].id,
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM today
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),   // 3 PM today
      requestedBy: 'Jane Smith',
    },
    {
      resourceId: createdResources[1].id,
      startTime: new Date(today.getTime() + 11 * 60 * 60 * 1000), // 11 AM today
      endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000),   // 12 PM today
      requestedBy: 'Mike Johnson',
    },
  ]

  for (const booking of sampleBookings) {
    const created = await prisma.booking.create({
      data: booking,
      include: {
        resource: true
      }
    })
    console.log(`✅ Created booking: ${created.resource.name} from ${created.startTime.toLocaleTimeString()} to ${created.endTime.toLocaleTimeString()}`)
  }

  console.log('🎉 Seeding completed successfully!')

};
