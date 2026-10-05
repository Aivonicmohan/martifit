import React from "react";
import { PublicInquiryClient } from "./PublicInquiryClient";

export function generateStaticParams() {
  return [
    { slug: "default" },
    { slug: "demo" },
  ];
}

export default function PublicInquiryPage() {
  return <PublicInquiryClient />;
}
