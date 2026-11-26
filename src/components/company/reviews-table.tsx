import { StarIcon } from "@/components/ui/icons";
import { tableStyles as t } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { RATINGS } from "@/lib/review-stats";
import type { Review } from "@/server/domain";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-0.5">
        {RATINGS.map((step) => (
          <StarIcon key={step} filled={step <= rating} />
        ))}
      </span>
      <span aria-hidden className="font-semibold tabular-nums">
        {rating}/5
      </span>
      <span className="sr-only">{rating} sur 5</span>
    </span>
  );
}

function ReviewerDetails({ review }: { review: Review }) {
  if (review.reviewerType !== "identified") {
    return <span className="text-gray-600">Anonyme</span>;
  }

  const name =
    [review.customerFirstName, review.customerLastName]
      .filter(Boolean)
      .join(" ") || "Client identifié";

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{name}</span>
      {review.customerPhone ? (
        <a
          href={`tel:${review.customerPhone}`}
          className="text-xs text-gray-600 underline underline-offset-2"
        >
          {review.customerPhone}
        </a>
      ) : null}
      {review.customerEmail ? (
        <a
          href={`mailto:${review.customerEmail}`}
          className="break-all text-xs text-gray-600 underline underline-offset-2"
        >
          {review.customerEmail}
        </a>
      ) : null}
    </div>
  );
}

/** DE-04 : avis du plus récent au plus ancien. Les commentaires sont du texte brut. */
export function ReviewsTable({ reviews }: { reviews: Review[] }) {
  return (
    <>
      {/* Sur téléphone, le commentaire est la colonne qui compte : il passe en
          pleine largeur plutôt que de rester coupé au bord de l'écran. */}
      <ul className="md:hidden">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="flex flex-col gap-2 border-t border-black/10 px-4 py-4 first:border-t-0"
          >
            <div className="flex items-center justify-between gap-3">
              <Stars rating={review.rating} />
              <span className="text-xs text-gray-600 tabular-nums">
                Déposé le {formatDate(review.createdAt)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-xs font-semibold text-gray-600">
                Répondant
              </span>
              <ReviewerDetails review={review} />
            </div>
            <p className="wrap-break-word text-sm leading-6 whitespace-pre-line">
              {review.comment ?? (
                <span className="text-gray-600">Sans commentaire</span>
              )}
            </p>
            {review.visitDate ? (
              <p className="text-xs text-gray-600">
                Visite du {formatDate(review.visitDate)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className={`${t.wrapper} hidden md:block`}>
        <table className={`${t.table} min-w-[900px]`}>
          <thead className={t.head}>
            <tr>
              <th
                scope="col"
                className={t.th}
                title="Date à laquelle le client a envoyé son avis."
              >
                Déposé le
              </th>
              <th scope="col" className={t.th}>
                Note
              </th>
              <th scope="col" className={t.th}>
                Répondant
              </th>
              <th scope="col" className={`${t.th} w-full`}>
                Commentaire
              </th>
              <th
                scope="col"
                className={t.th}
                title="Date de la visite indiquée par le client ; peut différer de la date de dépôt."
              >
                Date de visite
              </th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} className={t.row}>
                <td className={`${t.td} whitespace-nowrap tabular-nums`}>
                  {formatDate(review.createdAt)}
                </td>
                <td className={`${t.td} whitespace-nowrap`}>
                  <Stars rating={review.rating} />
                </td>
                <td className={t.td}>
                  <ReviewerDetails review={review} />
                </td>
                <td className={`${t.td} leading-6 wrap-break-word whitespace-pre-line`}>
                  {review.comment ?? (
                    <span className="text-gray-600">Sans commentaire</span>
                  )}
                </td>
                <td className={`${t.td} whitespace-nowrap tabular-nums`}>
                  {formatDate(review.visitDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
