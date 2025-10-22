import { NextRequest, NextResponse } from "next/server";

// GET /api/gmb/profile
// Fetches real Google Business Profile data using Google My Business API
export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId");
    const locationId = req.nextUrl.searchParams.get("locationId");

    if (!accountId || !locationId) {
      return NextResponse.json(
        { error: "accountId and locationId are required" },
        { status: 400 }
      );
    }

    const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Fetch location data from Google My Business API v4.9
    const locationUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}`;

    const locationResponse = await fetch(locationUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!locationResponse.ok) {
      const error = await locationResponse.json();
      throw new Error(error.error?.message || "Failed to fetch location");
    }

    const location = await locationResponse.json();

    // Fetch reviews
    const reviewsUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`;

    const reviewsResponse = await fetch(reviewsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const reviewsData = reviewsResponse.ok ? await reviewsResponse.json() : { reviews: [] };

    // Fetch media (photos)
    const mediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;

    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const mediaData = mediaResponse.ok ? await mediaResponse.json() : { mediaItems: [] };

    // Calculate photos added in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPhotos = mediaData.mediaItems?.filter((item: any) => {
      const createTime = new Date(item.createTime);
      return createTime >= thirtyDaysAgo;
    }) || [];

    // Calculate average rating from reviews
    const reviews = reviewsData.reviews || [];
    const totalRating = reviews.reduce((sum: number, review: any) => {
      return sum + (review.starRating === "FIVE" ? 5 :
                     review.starRating === "FOUR" ? 4 :
                     review.starRating === "THREE" ? 3 :
                     review.starRating === "TWO" ? 2 : 1);
    }, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Fetch local posts
    const postsUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

    const postsResponse = await fetch(postsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const postsData = postsResponse.ok ? await postsResponse.json() : { localPosts: [] };

    // Calculate posts per month (last 30 days)
    const recentPosts = postsData.localPosts?.filter((post: any) => {
      const createTime = new Date(post.createTime);
      return createTime >= thirtyDaysAgo;
    }) || [];

    // Transform to audit format
    const auditData = {
      businessName: location.locationName || "",
      city: location.address?.locality || "",
      primaryCategory: location.primaryCategory?.displayName || location.primaryCategory?.name || "",
      reviewCount: reviews.length,
      rating: parseFloat(averageRating.toFixed(1)),
      photosLast30d: recentPhotos.length,
      hasQA: false, // Not available in API - user must check manually
      postsPerMonth: recentPosts.length,
      hasWebsite: !!location.websiteUrl,
      hasHours: !!(location.regularHours?.periods && location.regularHours.periods.length > 0),
      hasServices: !!(location.serviceArea || location.serviceItems?.length > 0),
      hasBookingLink: !!location.metadata?.newReviewUrl,
      hasDuplicateListing: false, // Cannot detect automatically
      napConsistent: true, // Assume true from primary source

      // Additional metadata
      metadata: {
        phone: location.phoneNumbers?.primaryPhone || "",
        website: location.websiteUrl || "",
        address: location.address,
        profile: location.profile,
        openInfo: location.openInfo,
        lastUpdated: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: auditData,
      raw: {
        location,
        reviews: reviews.slice(0, 10), // Last 10 reviews
        recentPhotos: recentPhotos.length,
        recentPosts: recentPosts.length,
      },
    });

  } catch (error: any) {
    console.error("GMB API error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch GMB data",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// POST /api/gmb/auth
// Exchange authorization code for access token
export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Authorization code required" }, { status: 400 });
    }

    const tokenUrl = "https://oauth2.googleapis.com/token";

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/gmb/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || "Token exchange failed");
    }

    const tokens = await response.json();

    return NextResponse.json({
      success: true,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

  } catch (error: any) {
    console.error("GMB auth error:", error);
    return NextResponse.json(
      { error: error.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
