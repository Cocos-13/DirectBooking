import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Gallery } from "@/components/Gallery";
import { Description } from "@/components/Description";
import { Amenities } from "@/components/Amenities";
import { Reviews } from "@/components/Reviews";
import { LocationSection } from "@/components/LocationSection";
import { HouseRules } from "@/components/HouseRules";
import { WhyDirect } from "@/components/WhyDirect";
import { BookingSection } from "@/components/BookingSection";
import { BookingBar } from "@/components/BookingBar";
import { ContactFab } from "@/components/ContactFab";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/content/siteConfig";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "VacationRental"],
    name: siteConfig.name,
    description:
      "Fully renovated 70m² apartment on Ypsila Alonia square in central Patras. 2 bedrooms, sleeps up to 5. Airbnb Superhost.",
    url: siteConfig.url,
    image: siteConfig.images.map((img) => `${siteConfig.url}${img.src}`),
    telephone: siteConfig.contact.phone,
    priceRange: `€${siteConfig.priceFromEur}+`,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.streetAddress,
      addressLocality: siteConfig.address.addressLocality,
      addressRegion: siteConfig.address.addressRegion,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.geo.latitude,
      longitude: siteConfig.geo.longitude,
    },
    numberOfRooms: siteConfig.capacity.bedrooms,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: siteConfig.capacity.maxGuests,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: siteConfig.ratings.airbnbScore,
      reviewCount: siteConfig.ratings.airbnbReviewCount,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Gallery />
        <Description />
        <Amenities />
        <Reviews />
        <LocationSection />
        <HouseRules />
        <WhyDirect />
        <BookingSection />
      </main>
      <Footer />
      <BookingBar />
      <ContactFab />
    </>
  );
}
