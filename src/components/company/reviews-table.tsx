import { formatDate } from "@/lib/format";
import type { Review } from "@/server/domain";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden className="tracking-wider">
        {"★".repeat(rating)}
        <span className="text-gray-600">{"☆".repeat(5 - rating)}</span>
      </span>
      <span className="sr-only">{rating} sur 5</span>
    </span>
  );
}

const cell = "px-3 py-3 align-top";

/** DE-04 : avis du plus récent au plus ancien. Les commentaires sont du texte brut. */
export function ReviewsTable({ reviews }: { reviews: Review[] }) {
  return (
    <div className="relative overflow-x-auto rounded border border-black/15">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="bg-black text-white">
          <tr>
            <th scope="col" className={cell}>
              Déposé le
            </th>
            <th scope="col" className={cell}>
              Note
            </th>
            <th scope="col" className={`${cell} w-1/2`}>
              Commentaire
            </th>
            <th scope="col" className={cell}>
              Date de visite
            </th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id} className="border-t border-black/15">
              <td className={`${cell} whitespace-nowrap tabular-nums`}>
                {formatDate(review.createdAt)}
              </td>
              <td className={cell}>
                <Stars rating={review.rating} />
              </td>
              <td className={`${cell} whitespace-pre-line break-words`}>
                {review.comment ?? (
                  <span className="text-gray-600">Sans commentaire</span>
                )}
              </td>
              <td className={`${cell} whitespace-nowrap tabular-nums`}>
                {formatDate(review.visitDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
