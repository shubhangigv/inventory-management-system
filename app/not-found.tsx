import { ButtonLink, PageHeader } from "./components/ui";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not found" description="This page or record doesn't exist. It may have been deleted." />
      <div>
        <ButtonLink href="/" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    </>
  );
}
