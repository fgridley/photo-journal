import type { NextPage } from 'next'
import Image from 'next/future/image'
import { Client } from "@notionhq/client";

type Location = {
  name: string;
  inTransit: boolean;
  inTransitFrom: string;
  inTransitTo: string;
  photos: Photo[];
};

type Photo = {
  date: string;
  url: string;
};

// Adds classes to position timeline label based on transit status
const timelineLabelClasses = (locations: Location[], index: number): String => {
  // if location is inTransit and next location is inTransit, positiion label at the bottom
  if (locations[index].inTransit && locations[index + 1] && locations[index + 1].inTransit) { 
    return "self-end"
  }
  // else if location is static, label is sticky
  else if (!locations[index].inTransit) {
    return "sticky self-start"
  }
  // else hide timeline label
  else { 
    return "invisible"
  }
}

const timelineLabel = (locations: Location[], location: Location, index: number) => (
  <div className="timeline-date mr-6">
    <p className="text-2xl">{timelineLabelText(locations, index)}</p>
  </div>
);

// Returns timeline location label text based on transit status
const timelineLabelText = (locations: Location[], index: number): String => {
  // if location is inTransit and next location is inTransit show the inTransitFrom location,
  if (locations[index].inTransit && locations[index + 1] && locations[index + 1].inTransit) {
    return locations[index].inTransitFrom
  }
  // else if location is static show location
  else if (!locations[index].inTransit) {
    return locations[index].name
  }
  // else (location is inTransit) dont show label
  else {
    return ""
  }
}

type IndexProps = {
  locations: Location[];
}

const Index: NextPage<IndexProps> = ({ locations }: IndexProps) => {
  return (
    <div>
      <h1 className="text-4xl m-8 mt-40 flex justify-center font-bold">Photo Journal</h1>
      <h3 className="text-2xl flex justify-center">🚧 This site is under construction 🚧</h3>
      {/* Timeline section */}
      <div className="timeline mt-60">
        {locations.map((location: Location, index: number) => {
          return (
            <div className="timeline-item flex flex-row flex-nowrap flex-stretch flex-full-width mx-4 sm:mx-0" key={index}>
              <div className="timeline-left flex sm:flex-grow basis-1 sm:basis-4 align-start justify-end mr-4 sm:mr-8">
                <div className={"timeline-labels lg:w-40 flex align-stretch justify-end mb-1 top-2 lg:top-[30vh] " + timelineLabelClasses(locations, index)}>
                  <div className="hidden lg:block">
                    {timelineLabel(locations, location, index)}
                  </div>
                  <div className="timeline-circle border-4 border-white bg-black rounded-full relative -left-0.5 w-6 min-w-[24px] h-6 my-auto"></div>
                </div>
                {/* if location is inTransit render dotted line */}
                <div className={`timeline-line border-r-4 border-black h-full -left-2 relative ${location.inTransit ? "border-dashed" : ""}`} style={{ zIndex: "-2", left: "-16px" }}></div>
                
              </div>
              <div className="timeline-center pr-4 flex-grow basis-4">
                <div className="flex sticky top-0 py-1 z-10 bg-white lg:hidden">
                  {timelineLabel(locations, location, index)}
                </div>
                {location.photos.map((photo: Photo) => {
                  return (
                    <div className="image-wrapper" key={photo.date}>
                      <div className="relative w-full sm:min-w-[500px]">
                        {/* This should be using Next Image but there are some issues */}
                        {/* with the number of image optimizations that are being used */}
                        <img
                          src={photo.url}
                          width={500}
                          height={500}
                          alt={location.name}
                          style={{ objectFit: "contain" }}
                        />
                      </div>
                      <div className="image-caption mb-8">
                        <p className="text-l">{photo.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="timeline-right sm:flex-grow basis-1 sm:basis-4" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const getServerSideProps = async () => {

  const NUMBER_OF_PHOTOS = parseInt(process.env.NUMBER_OF_PHOTOS || "50");
  const today = new Date();
  const photosStartDate = new Date(today);
  photosStartDate.setDate(today.getDate() - NUMBER_OF_PHOTOS);
  
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const response = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID as string,
    page_size: NUMBER_OF_PHOTOS,
    filter: {
      and: [
        {
          property: "Photo",
          files: {
            is_not_empty: true,
          },
        },
        {
          property: "Location",
          rich_text: {
            is_not_empty: true,
          },
        },
        {
          property: "Date",
          date: {
            on_or_after: photosStartDate.toISOString(),
          },
        }
      ],
    },
    sorts: [
      {
        property: "Date",
        direction: "ascending",
      },
    ],
  });

  const locations: Location[] = [];

  let lastLocation: Location;

  response.results.forEach((page) => {
    // @ts-ignore
    const date = page.properties.Name.title[0].plain_text;
    // @ts-ignore
    const url = page.properties.Photo.files[0].file.url;
    // @ts-ignore
    const locationName = page.properties["Location"].rich_text[0].plain_text;

    const photo: Photo = {
      date,
      url,
    };

    // if the last location is the same as the current location, add the photo to the last location
    if (lastLocation && lastLocation.name === locationName) {
      lastLocation.photos.unshift(photo);  // add photo to the beginning of the array so they they show up in order
    }
    // if the inTransitTo property is the same as the current location, create a new location
    else if (lastLocation && lastLocation.inTransitTo === locationName) {
      const location: Location = {
        name: locationName,
        inTransit: false,
        inTransitFrom: "",
        inTransitTo: "",
        photos: [photo],
      };
      locations.push(location);
      lastLocation = location;
    }
    // look for the last date from the photos in the previous location and see if that is one day before the current date
    // since the photos are sorted from newest to oldest, the first photo in the array is the most recent
    else if (lastLocation && lastLocation.photos.length > 0 && isOneDayBefore(lastLocation.photos[0].date, date)) {
      // create a new in transit location
      const inTransitLocation: Location = {
        name: lastLocation.inTransit ? lastLocation.inTransitTo + " → " + locationName : lastLocation.name + " → " + locationName,
        inTransit: true,
        inTransitFrom: lastLocation.name.includes("→") ? lastLocation.inTransitTo : lastLocation.name,
        inTransitTo: locationName,
        photos: [photo],
      };
      locations.push(inTransitLocation);
      lastLocation = inTransitLocation;
    }
    // if the last location is not the same as the current location, create a new location
    else {
      const location: Location = {
        name: locationName,
        inTransit: false,
        inTransitFrom: "",
        inTransitTo: "",
        photos: [photo],
      };
      locations.push(location);
      lastLocation = location;
    }
  });

  // reverse the array so photos are in chronological order
  locations.reverse();

  return {
    props: {
      locations,
    },
  };
};

function isOneDayBefore(date1: string, date2: string) {
  const date1Date = new Date(date1);
  const date2Date = new Date(date2);
  const difference = date2Date.getTime() - date1Date.getTime();
  const differenceInDays = difference / (1000 * 3600 * 24);
  return differenceInDays === 1;
};

export default Index;
