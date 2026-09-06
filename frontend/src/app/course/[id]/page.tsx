import CourseDetail from '@/screens/CourseDetail'

export default function CoursePage({ params }: { params: { id: string } }) {
  return <CourseDetail courseId={params.id} />
}
