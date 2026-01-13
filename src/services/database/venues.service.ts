import prisma from '@/lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from './errors';
import type { VenueStatus, PromotionTier } from '@prisma/client';

export interface VenueFilters {
  status?: VenueStatus | 'all';
}

export interface CreateVenueData {
  name: string;
  address: string;
  neighborhood?: string;
  website?: string;
  imageUrl?: string;
}

export interface UpdateVenueData {
  name?: string;
  address?: string;
  neighborhood?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  promotionTier?: PromotionTier;
}

export class VenuesService {
  /**
   * Find all venues with optional filters
   */
  static async findAll(filters: VenueFilters = {}, userRole?: string) {
    const { status = 'approved' } = filters;

    // Only admins can see pending venues
    if (status === 'pending' && userRole !== 'admin') {
      throw new ForbiddenError('Only admins can view pending venues');
    }

    const where = status === 'all' ? {} : { status };

    const venues = await prisma.venue.findMany({
      where,
      include: {
        _count: {
          select: { events: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return venues.map((v) => ({
      id: v.id,
      name: v.name,
      address: v.address,
      neighborhood: v.neighborhood,
      website: v.website,
      imageUrl: v.imageUrl,
      status: v.status,
      promotionTier: v.promotionTier,
      eventCount: v._count.events,
    }));
  }

  /**
   * Find a single venue by ID
   */
  static async findById(id: string) {
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        events: {
          where: { status: 'approved' },
          include: {
            categories: true,
            _count: {
              select: { likes: true },
            },
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
          ],
        },
      },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    return {
      ...venue,
      events: venue.events.map((e) => ({
        ...e,
        categories: e.categories.map((c) => c.name),
        likeCount: e._count.likes,
      })),
    };
  }

  /**
   * Create a new venue
   */
  static async create(data: CreateVenueData, userId: string, userRole: string) {
    const { name, address, neighborhood, website, imageUrl } = data;

    if (!name || !address) {
      throw new ValidationError('Name and address are required');
    }

    // Auto-approve if admin
    const status = userRole === 'admin' ? 'approved' : 'pending';

    const venue = await prisma.venue.create({
      data: {
        name,
        address,
        neighborhood,
        website,
        imageUrl,
        status,
      },
    });

    return venue;
  }

  /**
   * Update a venue (admin only)
   */
  static async update(id: string, data: UpdateVenueData, userId: string, userRole: string) {
    if (userRole !== 'admin') {
      throw new ForbiddenError('Only admins can update venues');
    }

    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Validate promotionTier if provided
    if (data.promotionTier) {
      const validTiers: PromotionTier[] = ['standard', 'promoted', 'featured'];
      if (!validTiers.includes(data.promotionTier)) {
        throw new ValidationError(`Invalid promotion tier. Must be one of: ${validTiers.join(', ')}`);
      }
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood === '' ? null : data.neighborhood;
    if (data.website !== undefined) updateData.website = data.website === '' ? null : data.website;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl === '' ? null : data.imageUrl;
    if (data.promotionTier !== undefined) updateData.promotionTier = data.promotionTier;

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: updateData,
    });

    return updatedVenue;
  }

  /**
   * Approve a venue (admin only)
   */
  static async approve(id: string, adminId: string) {
    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: { status: 'approved' },
    });

    return updatedVenue;
  }

  /**
   * Reject a venue (admin only)
   */
  static async reject(id: string, adminId: string) {
    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    const updatedVenue = await prisma.venue.update({
      where: { id },
      data: { status: 'rejected' },
    });

    return updatedVenue;
  }

  /**
   * Delete a venue (admin only)
   */
  static async delete(id: string, adminId: string) {
    const venue = await prisma.venue.findUnique({
      where: { id },
    });

    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    await prisma.venue.delete({
      where: { id },
    });

    return { success: true };
  }
}
