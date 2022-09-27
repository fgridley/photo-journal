import type { NextPage } from 'next'
import Image from 'next/image'
import { Client } from "@notionhq/client";

const Index: NextPage = ({ locations }) => {

  // remove the first 20 locations (for testing purposes)
  locations = locations.slice(20)

  return (
    <div>
      <h1>Photo Journal</h1>
      {locations.map((location: Location, index: number) => {
        return (
          <div key={index}>
            <h2>{location.name}</h2>
            {location.photos.map((photo: Photo) => {
              return (
                <div>
                  <Image
                    src={photo.url}
                    width={400}
                    height={400}
                    />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

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
