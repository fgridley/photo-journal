import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Client } from "@notionhq/client";

const Index: NextPage = ({ data }) => {
  const images = data.results.map((item) => {
    const imageUrl = item.properties?.Photo?.files[0]?.file?.url;
    const date = item.properties?.Name?.title[0]?.plain_text;
    return (
      <div key={item.id}>
        <Image
          src={imageUrl}
          alt={date}
          width={500}
          height={500}
        />
        <p>{date}</p>
      </div>
    );
  });

  return (
    <div>
      <h1>Notion API</h1>


      {images}
    </div>
  );
};

export const getStaticProps = async () => {
  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const data = await notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    page_size: 10,
    sorts: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
    filter: {
      property: "Photo",
      files: {
        is_not_empty: true,
      },
    },
  });

  return {
    props: {
      data
    },
  };
};


export default Index;
