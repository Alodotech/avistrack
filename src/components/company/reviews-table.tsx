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

/** DE-04 : avis du plus récent au plus ancien. Les commentaires sont du texte brut. */
export function ReviewsTable({ reviews }: { reviews: Review[] }) {
  return (
    <div className={t.wrapper}>
      <table className={`${t.table} min-w-176`}>
        <thead className={t.head}>
          <tr>
            <th scope="col" className={t.th}>
              Déposé le
            </th>
            <th scope="col" className={t.th}>
              Note
            </th>
            <th scope="col" className={`${t.th} w-full`}>
              Commentaire
            </th>
            <th scope="col" className={t.th}>
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
  );
}
