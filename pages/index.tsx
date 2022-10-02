import type { NextPage } from 'next'
import Image from 'next/future/image'
import { Client } from "@notionhq/client";

type Location = {
  id: string;
  name: string;
  inTransit: boolean;
  photos: Photo[];
};

type Photo = {
  url: string;
  date: string;
};

const Index: NextPage = ({ locations }) => {

  // remove the first 20 locations (for testing purposes)
  locations = locations.slice(20)

  return (
    <div>
      <h1 className="text-4xl mb-8">Photo Journal</h1>
      {/* Timeline section */}
      <div className="timeline">
        {locations.map((location: Location, index: number) => {
          return (
            <div className="timeline-item flex flex-row flex-nowrap flex-stretch flex-full-width">
              <div className="timeline-left flex flex-grow basis-4 align-start justify-end">
                <div className="timeline-labels flex align-stretch justify-end">
                  <div className="timeline-date sticky top-4 m-8">
                    <p className="text-2xl">{location.name}</p>
                  </div>
                  <div className="timeline-circle border-2 border-black rounded-full w-4 h-4"></div>
                </div>
                <div className="timeline-line border-l-4 border-black h-full"></div>
              </div>
              <div className="timeline-center flex-grow basis-4">
                {location.photos.map((photo: Photo) => {
                  return (
                    <div className="image-wrapper">
                      <div className="w-full relative">
                        <Image
                          src={photo.url}
                          width={500}
                          height={500}
                          layout="fill"
                          objectFit="contain"
                        />
                      </div>
                      <div className="image-caption">
                        <p className="text-xl">{photo.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="timeline-right flex-grow basis-4"/>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const getStaticProps = async () => {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const data = await notion.databases.query({
    database_id: process.env.NOTION_LOCATIONS_DATABASE_ID,
    page_size: 40,
    sorts: [
      {
        property: "Dates",
        direction: "descending",
      },
    ]
  });

  // Build a list of locations
  const locations: Location[] = [];
  data.results.forEach((item) => {
    const id = item.id;
    const location = item.properties.Name.title[0].plain_text;
    const inTransit = item.properties["In Transit"].formula.boolean;

    // Create a new location
    locations.push({
      id,
      name: location,
      inTransit,
      photos: [],
    });
  });

  await Promise.all(
    locations.map(async (location) => {
      // Query for the photos associated with each location and add them to the location
      const photos = await notion.databases.query({
        database_id: process.env.NOTION_JOURNAL_DATABASE_ID,
        filter: {
          property: "Location Relation",
          relation: {
            contains: location.id,
          },
        },
        sorts: [
          {
            property: "Date",
            direction: "descending",
          },
        ],
      });

      // Add the photos to the location
      photos.results.forEach((photo) => {
        location.photos.push({
          url: photo.properties["Photo"].files[0].file.url,
          date: photo.properties["Date"].date.start,
        });
      });
    })
  );

  return {
    props: {
      locations
    },
  };
};

export default Index;
